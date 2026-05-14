import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectRequest } from './entities/project-request.entity';
import { Group } from '../groups/entities/group.entity';
import { SupervisorRequest } from '../supervisor/entities/supervison.request.entity';
import { Student } from '../students/entities/student.entity';
import { Supervisor } from '../supervisor/entities/supervisor.entity';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class ProjectRequestService {
  constructor(
    @InjectRepository(ProjectRequest)
    private readonly repo: Repository<ProjectRequest>,

    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,

    @InjectRepository(SupervisorRequest)
    private readonly supRequestRepo: Repository<SupervisorRequest>,

    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,

    @InjectRepository(Supervisor)
    private readonly supervisorRepo: Repository<Supervisor>,

    private readonly groupsService: GroupsService,
  ) {}

  // ── Student sends a request for a supervisor's approved project ──────────
  async send(body: {
    studentId: number;
    supervisorProposalId: number;
    supervisorId: number;
    description?: string;
    teamMembers?: Record<string, string>;
    memberStudentIds?: number[];
  }) {
    const { studentId, supervisorProposalId, supervisorId } = body;

    // ── MUTEX: Check if student already has a pending supervision request ──
    const pendingSupReq = await this.supRequestRepo.findOne({
      where: { studentId, status: 'pending' },
    });
    if (pendingSupReq) {
      throw new BadRequestException(
        'You already have a pending supervision request. Wait for it to be resolved before applying here.',
      );
    }

    // ── MUTEX: Check if student already has a pending project request ──────
    const pendingProjReq = await this.repo.findOne({
      where: { studentId, status: 'pending' },
    });
    if (pendingProjReq) {
      throw new BadRequestException(
        'You already have a pending project request. Wait for it to be resolved.',
      );
    }

    // ── Check if student is already in a group ────────────────────────────
    const inGroup = await this.groupsService.isStudentInGroup(studentId);
    if (inGroup) {
      throw new BadRequestException('You are already assigned to a group.');
    }

    // ── Check team members ─────────────────────────────────────────────────
    const memberIds = body.memberStudentIds || [];
    for (const memberId of memberIds) {
      const memberInGroup = await this.groupsService.isStudentInGroup(memberId);
      if (memberInGroup) {
        throw new BadRequestException(`A team member (ID: ${memberId}) is already in a group.`);
      }
      // Check if team member has pending request of any kind
      const memberPending = await this.repo.findOne({ where: { studentId: memberId, status: 'pending' } });
      const memberPendingSup = await this.supRequestRepo.findOne({ where: { studentId: memberId, status: 'pending' } });
      if (memberPending || memberPendingSup) {
        throw new BadRequestException(`A team member (ID: ${memberId}) already has a pending request.`);
      }
    }

    // ── Check supervisor capacity ─────────────────────────────────────────
    const supervisor = await this.supervisorRepo.findOne({ where: { id: supervisorId } });
    if (!supervisor) throw new BadRequestException('Supervisor not found');

    const groupCount = await this.groupsService.countGroupsForSupervisor(supervisorId);
    if (groupCount >= (supervisor.maxGroups || 3)) {
      throw new BadRequestException('This supervisor has reached their maximum group limit.');
    }

    // ── Check if this supervisor proposal is already taken ─────────────────
    const existingGroup = await this.groupRepo.findOne({
      where: { supervisorProposalId: body.supervisorProposalId },
    });
    if (existingGroup) {
      throw new BadRequestException('This project has already been taken by another team.');
    }

    const request = this.repo.create({
      studentId,
      supervisorProposalId,
      supervisorId,
      description: body.description || '',
      teamMembers: body.teamMembers || {},
      memberStudentIds: memberIds,
      status: 'pending',
    });
    await this.repo.save(request);
    return { message: 'Request sent successfully' };
  }

  // ── Supervisor sees pending project requests for their proposals ──────────
  async getForSupervisor(supervisorId: number) {
    const requests = await this.repo.find({
      where: { supervisorId: Number(supervisorId), status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    // Enrich with student info
    const enriched: Array<ProjectRequest & { leadStudentName: string; leadStudentReg: string }> = [];
    for (const r of requests) {
      const leadStudent = await this.studentRepo.findOne({
        where: { id: r.studentId },
        relations: ['user'],
      });
      enriched.push({
        ...r,
        leadStudentName: leadStudent?.user?.name || '',
        leadStudentReg: leadStudent?.regNo || '',
      });
    }
    return enriched;
  }

  // ── Student checks their own active project request ──────────────────────
  async getMyRequest(studentId: number) {
    return this.repo.findOne({
      where: { studentId: Number(studentId) },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Supervisor accepts a project request → create group ───────────────────
  async accept(requestId: number) {
    const request = await this.repo.findOne({ where: { id: requestId } });
    if (!request) throw new BadRequestException('Request not found');
    if (request.status !== 'pending') throw new BadRequestException('Request already processed');

    // Re-check capacity
    const supervisor = await this.supervisorRepo.findOne({ where: { id: request.supervisorId } });
    const groupCount = await this.groupsService.countGroupsForSupervisor(request.supervisorId);
    if (groupCount >= (supervisor?.maxGroups || 3)) {
      throw new BadRequestException('You have reached your maximum group limit.');
    }

    // Check duplicate group
    const existingGroup = await this.groupRepo.findOne({
      where: {
        supervisorProposalId: request.supervisorProposalId,
        leadStudentId: request.studentId,
        supervisorId: request.supervisorId,
      },
    });
    if (existingGroup) {
      request.status = 'accepted';
      await this.repo.save(request);
      return { message: 'Request accepted (group already exists)', group: existingGroup };
    }

    request.status = 'accepted';
    await this.repo.save(request);

    // Build student IDs array
    const allStudentIds = [request.studentId, ...(request.memberStudentIds || [])];

    // Lead student reg number
    const leadStudent = await this.studentRepo.findOne({ where: { id: request.studentId } });
    const leadReg = leadStudent?.regNo || `Student#${request.studentId}`;

    const memberRegs = request.teamMembers
      ? (Object.values(request.teamMembers) as string[]).filter(Boolean)
      : [];
    const studentRegs = [leadReg, ...memberRegs];

    // Create group — uses supervisorProposalId, proposalId is null
    const group = await this.groupRepo.save({
      proposalId: undefined,
      supervisorProposalId: request.supervisorProposalId,
      supervisorId: request.supervisorId,
      leadStudentId: request.studentId,
      studentRegs,
      studentIds: allStudentIds,
      committeeId: null,
    });

    // ── Auto-reject ALL other pending requests for this supervisor proposal ──
    await this.repo
      .createQueryBuilder()
      .update(ProjectRequest)
      .set({ status: 'rejected' })
      .where('supervisorProposalId = :spId AND id != :requestId AND status = :status', {
        spId: request.supervisorProposalId,
        requestId: request.id,
        status: 'pending',
      })
      .execute();

    // Cancel other pending project requests from the lead student (for other proposals)
    await this.repo
      .createQueryBuilder()
      .update(ProjectRequest)
      .set({ status: 'cancelled' })
      .where('studentId = :studentId AND id != :requestId AND status = :status', {
        studentId: request.studentId,
        requestId: request.id,
        status: 'pending',
      })
      .execute();

    // Cancel pending requests from team members
    for (const memberId of request.memberStudentIds || []) {
      await this.repo
        .createQueryBuilder()
        .update(ProjectRequest)
        .set({ status: 'cancelled' })
        .where('studentId = :studentId AND status = :status', { studentId: memberId, status: 'pending' })
        .execute();
    }

    return { message: 'Request accepted, group created successfully', group };
  }

  // ── Supervisor rejects a project request ─────────────────────────────────
  async reject(requestId: number) {
    const request = await this.repo.findOne({ where: { id: requestId } });
    if (!request) throw new BadRequestException('Request not found');
    request.status = 'rejected';
    await this.repo.save(request);
    return { message: 'Request rejected. Student can now send a new request.' };
  }
}
