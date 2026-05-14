import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Committee } from './entities/committee.entity';
import { Supervisor } from '../supervisor/entities/supervisor.entity';
import { Group } from '../groups/entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class CommitteeService {
  constructor(
    @InjectRepository(Committee) private committeeRepo: Repository<Committee>,
    @InjectRepository(Supervisor) private supervisorRepo: Repository<Supervisor>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private emailService: EmailService,
  ) {}

  // ── AUTO GENERATE ───────────────────────────────────────────────────────────
  async autoGenerate(options: { reassignGroups?: boolean } = {}) {
    const existingCommittees = await this.committeeRepo.find();
    const usedSupervisorIds = new Set<number>(
      existingCommittees.flatMap((c) => c.memberIds),
    );

    const allSupervisors = await this.supervisorRepo.find({ relations: ['user'] });
    const pool = allSupervisors.filter((s) => !usedSupervisorIds.has(s.id));

    if (pool.length < 3) {
      throw new BadRequestException(
        `Need at least 3 unassigned supervisors to form a new committee. Currently available: ${pool.length}.`,
      );
    }

    // Form committees from pool
    const formed = this.formCommittees(pool);

    // Save new committees
    const startIdx = existingCommittees.length;
    const saved: Committee[] = [];
    for (let i = 0; i < formed.length; i++) {
      const name = `Committee ${String.fromCharCode(65 + startIdx + i)}`;
      const c = this.committeeRepo.create({ name, memberIds: formed[i].map((s) => s.id), groupIds: [] });
      saved.push(await this.committeeRepo.save(c));
    }

    // Assign groups
    const allCommittees = [...existingCommittees, ...saved];
    const assignedCount = await this.assignGroupsToCommittees(allCommittees, options.reassignGroups ?? false);

    return {
      message: `${saved.length} committees created, ${assignedCount} groups assigned.`,
      committeesCreated: saved.length,
      groupsAssigned: assignedCount,
    };
  }

  // ── COMMITTEE FORMATION ALGORITHM ──────────────────────────────────────────
  private formCommittees(supervisors: Supervisor[]): Supervisor[][] {
    const rank = (d: string) => {
      const l = (d || '').toLowerCase();
      if (l.includes('associate')) return 0;
      if (l.includes('assistant')) return 1;
      return 2;
    };

    // Build expertise → supervisors map
    const expMap = new Map<string, Supervisor[]>();
    for (const s of supervisors) {
      for (const exp of s.expertise || []) {
        if (!expMap.has(exp)) expMap.set(exp, []);
        expMap.get(exp)!.push(s);
      }
    }
    for (const [, arr] of expMap) arr.sort((a, b) => rank(a.designation) - rank(b.designation));

    const committees: Supervisor[][] = [];
    const assigned = new Set<number>();

    const unassigned = () => supervisors.filter((s) => !assigned.has(s.id));

    while (unassigned().length >= 3) {
      const members: Supervisor[] = [];

      // Pick diverse expertise first
      for (const [, arr] of expMap) {
        if (members.length >= 4) break;
        const pick = arr.find((s) => !assigned.has(s.id) && !members.includes(s));
        if (pick) { members.push(pick); assigned.add(pick.id); }
      }

      // Fill to minimum 3 with remaining (prefer associate prof)
      while (members.length < 3) {
        const rem = unassigned().sort((a, b) => rank(a.designation) - rank(b.designation));
        if (!rem.length) break;
        members.push(rem[0]);
        assigned.add(rem[0].id);
      }

      if (members.length >= 3) committees.push(members.slice(0, 4));
    }

    // Merge any leftover (1-2) into last committee if possible
    const leftover = unassigned();
    if (leftover.length > 0 && committees.length > 0) {
      const last = committees[committees.length - 1];
      for (const s of leftover) {
        if (last.length < 4) { last.push(s); assigned.add(s.id); }
      }
    }

    return committees;
  }

  // ── GROUP ASSIGNMENT ALGORITHM ──────────────────────────────────────────────
  private async assignGroupsToCommittees(committees: Committee[], reassign: boolean): Promise<number> {
    // Load groups WITH proposal relation so we can read proposal.domain
    const allGroups = await this.groupRepo.find({ relations: ['proposal'] });

    if (reassign) {
      // Clear existing assignments
      for (const c of committees) c.groupIds = [];
      for (const g of allGroups) await this.groupRepo.update(g.id, { committeeId: null });
    }

    const toAssign = reassign ? allGroups : allGroups.filter((g) => !g.committeeId);
    let count = 0;

    for (const group of toAssign) {
      const groupDomain = (group.proposal?.domain || '').toLowerCase().trim();

      // Existing constraint: supervisor must NOT be a committee member + capacity < 6
      const eligible = committees.filter(
        (c) => !c.memberIds.includes(group.supervisorId) && (c.groupIds || []).length < 6,
      );

      if (!eligible.length) continue;

      // ── Domain-preference scoring ──────────────────────────────────────────
      // Score each eligible committee higher if it already contains groups from
      // the same domain (so same-domain projects cluster together).
      const scored = eligible.map((c) => {
        let score = 0;

        if (groupDomain) {
          // Count how many existing groups in this committee share the same domain
          const domainMatches = (c.groupIds || []).filter((gId) => {
            const existing = allGroups.find((g) => g.id === gId);
            return (existing?.proposal?.domain || '').toLowerCase().trim() === groupDomain;
          }).length;
          score += domainMatches * 10; // 10 pts per domain-matching group
        }

        // Tie-break: prefer less-loaded committee (load balancing)
        score -= (c.groupIds || []).length;

        return { committee: c, score };
      });

      // Pick committee with highest score
      scored.sort((a, b) => b.score - a.score);
      const target = scored[0].committee;

      if (!target.groupIds) target.groupIds = [];
      target.groupIds.push(group.id);
      await this.groupRepo.update(group.id, { committeeId: target.id });
      count++;
    }

    for (const c of committees) await this.committeeRepo.save(c);
    return count;
  }


  // ── HELPERS ─────────────────────────────────────────────────────────────────
  private buildEnriched(committee: Committee, allSups: Supervisor[], allGroups: Group[]) {
    const members = (committee.memberIds || []).map((id) => {
      const s = allSups.find((x) => x.id === id);
      return { id: s?.id || id, name: s?.user?.name || `Supervisor #${id}`, email: s?.user?.email || '', designation: s?.designation || '', expertise: s?.expertise || [] };
    });

    const groups = (committee.groupIds || []).map((id) => {
      const g = allGroups.find((x) => x.id === id);
      const sup = allSups.find((x) => x.id === g?.supervisorId);
      return { id: g?.id || id, proposalId: g?.proposalId, supervisorId: g?.supervisorId, supervisorName: sup?.user?.name || '', studentRegs: g?.studentRegs || [], studentIds: g?.studentIds || [] };
    });

    return { id: committee.id, name: committee.name, memberIds: committee.memberIds, groupIds: committee.groupIds, createdAt: committee.createdAt, members, groups };
  }

  // ── GET ALL ──────────────────────────────────────────────────────────────────
  async getAll() {
    const committees = await this.committeeRepo.find({ order: { createdAt: 'ASC' } });
    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    const groups = await this.groupRepo.find();
    return committees.map((c) => this.buildEnriched(c, sups, groups));
  }

  // ── GET BY ID ────────────────────────────────────────────────────────────────
  async getById(id: number) {
    const c = await this.committeeRepo.findOne({ where: { id } });
    if (!c) throw new BadRequestException('Committee not found');
    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    const groups = await this.groupRepo.find();
    return this.buildEnriched(c, sups, groups);
  }

  // ── GET BY SUPERVISOR ────────────────────────────────────────────────────────
  async getBySupervisor(supervisorId: number) {
    const all = await this.committeeRepo.find();
    const c = all.find((x) => x.memberIds.includes(Number(supervisorId)));
    if (!c) return null;
    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    const groups = await this.groupRepo.find();
    return this.buildEnriched(c, sups, groups);
  }

  // ── GET BY GROUP ─────────────────────────────────────────────────────────────
  async getByGroup(groupId: number) {
    const group = await this.groupRepo.findOne({ where: { id: Number(groupId) } });
    if (!group?.committeeId) return null;
    const c = await this.committeeRepo.findOne({ where: { id: group.committeeId } });
    if (!c) return null;
    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    const groups = await this.groupRepo.find();
    return this.buildEnriched(c, sups, groups);
  }

  // ── EDIT MEMBERS ─────────────────────────────────────────────────────────────
  async editMembers(committeeId: number, memberIds: number[]) {
    if (memberIds.length < 3 || memberIds.length > 4)
      throw new BadRequestException('Committee must have 3-4 members.');

    const others = (await this.committeeRepo.find()).filter((c) => c.id !== committeeId);
    for (const id of memberIds) {
      if (others.some((c) => c.memberIds.includes(id)))
        throw new BadRequestException(`Supervisor #${id} is already in another committee.`);
    }

    const c = await this.committeeRepo.findOne({ where: { id: committeeId } });
    if (!c) throw new BadRequestException('Committee not found.');
    c.memberIds = memberIds;
    return this.committeeRepo.save(c);
  }

  // ── ASSIGN GROUPS ────────────────────────────────────────────────────────────
  async assignGroups(committeeId: number, groupIds: number[]) {
    if (groupIds.length < 3 || groupIds.length > 6)
      throw new BadRequestException('Committee must have 3-6 groups.');

    const c = await this.committeeRepo.findOne({ where: { id: committeeId } });
    if (!c) throw new BadRequestException('Committee not found.');

    const groups = await this.groupRepo.findByIds(groupIds);
    for (const g of groups) {
      if (c.memberIds.includes(g.supervisorId))
        throw new BadRequestException(`Group #${g.id}'s supervisor is a member of this committee.`);
    }

    // Unassign old groups not in the new list
    for (const oldId of c.groupIds || []) {
      if (!groupIds.includes(oldId)) await this.groupRepo.update(oldId, { committeeId: null });
    }
    // Assign new groups
    for (const gId of groupIds) await this.groupRepo.update(gId, { committeeId: committeeId });

    c.groupIds = groupIds;
    return this.committeeRepo.save(c);
  }

  // ── RENAME ───────────────────────────────────────────────────────────────────
  async rename(committeeId: number, name: string) {
    const c = await this.committeeRepo.findOne({ where: { id: committeeId } });
    if (!c) throw new BadRequestException('Committee not found.');
    c.name = name;
    return this.committeeRepo.save(c);
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  async deleteCommittee(committeeId: number) {
    const c = await this.committeeRepo.findOne({ where: { id: committeeId } });
    if (!c) throw new BadRequestException('Committee not found.');
    for (const gId of c.groupIds || []) await this.groupRepo.update(gId, { committeeId: null });
    await this.committeeRepo.delete(committeeId);
    return { message: 'Committee deleted successfully.' };
  }

  // ── SEND EMAILS ──────────────────────────────────────────────────────────────
  async sendEmails(committeeId?: number) {
    const committees = committeeId
      ? [await this.committeeRepo.findOne({ where: { id: committeeId } })]
      : await this.committeeRepo.find();

    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    const groups = await this.groupRepo.find();
    const students = await this.studentRepo.find({ relations: ['user'] });

    let sent = 0;
    for (const c of committees) {
      if (!c) continue;
      const enriched = this.buildEnriched(c, sups, groups);

      // Email each committee member
      for (const member of enriched.members) {
        if (!member.email) continue;
        await this.emailService.sendCommitteeMemberEmail(member, enriched);
        sent++;
      }

      // Email students in assigned groups
      for (const group of enriched.groups) {
        for (const sId of group.studentIds || []) {
          const student = students.find((s) => s.id === sId);
          if (!student?.user?.email) continue;
          await this.emailService.sendStudentCommitteeEmail(student, group, enriched);
          sent++;
        }
      }
    }
    return { message: `${sent} emails sent.`, sent };
  }

  // ── GET ALL UNASSIGNED GROUPS (for admin UI) ─────────────────────────────────
  async getUnassignedGroups() {
    const allGroups = await this.groupRepo.find();
    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    return allGroups
      .filter((g) => !g.committeeId)
      .map((g) => {
        const sup = sups.find((s) => s.id === g.supervisorId);
        return { id: g.id, proposalId: g.proposalId, supervisorId: g.supervisorId, supervisorName: sup?.user?.name || '', studentRegs: g.studentRegs || [] };
      });
  }

  // ── GET ALL UNASSIGNED SUPERVISORS (for admin UI) ────────────────────────────
  async getUnassignedSupervisors() {
    const all = await this.committeeRepo.find();
    const usedIds = new Set(all.flatMap((c) => c.memberIds));
    const sups = await this.supervisorRepo.find({ relations: ['user'] });
    return sups
      .filter((s) => !usedIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.user?.name || '', designation: s.designation || '', expertise: s.expertise || [] }));
  }
}
