import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supervisor } from './entities/supervisor.entity';
import { Repository, Not } from 'typeorm';
import { SupervisorRequest } from './entities/supervison.request.entity';
import { Group } from 'src/groups/entities/group.entity';
import { User } from 'src/users/entities/user.entity';
import { GroupsService } from 'src/groups/groups.service';
import { Student } from 'src/students/entities/student.entity';
import { ProjectRequest } from 'src/project-request/entities/project-request.entity';

@Injectable()
export class SupervisorService {
  constructor(
    @InjectRepository(Supervisor)
    private repo: Repository<Supervisor>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(SupervisorRequest)
    private requestRepo: Repository<SupervisorRequest>,

    @InjectRepository(Group)
    private groupRepo: Repository<Group>,

    @InjectRepository(Student)
    private studentRepo: Repository<Student>,

    @InjectRepository(ProjectRequest)
    private projectRequestRepo: Repository<ProjectRequest>,

    private readonly groupsService: GroupsService,
  ) {}

  // ── Signup ──
  async create(data: {
    userId: number;
    designation?: string;
    expertise?: string[];
  }): Promise<Supervisor> {
    const supervisor = this.repo.create({
      userId: data.userId,
      designation: data.designation || '',
      expertise: data.expertise || [],
    });
    return this.repo.save(supervisor);
  }

  // ── Login ──
  async findByUserId(userId: number): Promise<Supervisor | null> {
    return this.repo.findOne({ where: { userId } });
  }

  // ── Get all supervisors with group count ──
  async getAllSupervisors() {
    const supervisors = await this.repo.find({ relations: ['user'] });
    const result: any[] = [];

    for (const s of supervisors) {
      const groupCount = await this.groupsService.countGroupsForSupervisor(s.id);
      result.push({
        id: s.id,
        name: s.user?.name || '',
        email: s.user?.email || '',
        designation: s.designation,
        expertise: s.expertise,
        groupCount,
        maxGroups: s.maxGroups || 3,
      });
    }

    return result;
  }

  // ── Student sends a supervisor request ──
  async sendSupervisorRequest(body: any) {
    const { studentId, proposalId, supervisorId, memberStudentIds } = body;

    // Check supervisor capacity
    const supervisor = await this.repo.findOne({ where: { id: supervisorId } });
    if (!supervisor) throw new BadRequestException('Supervisor not found');

    const groupCount = await this.groupsService.countGroupsForSupervisor(supervisorId);
    if (groupCount >= (supervisor.maxGroups || 3)) {
      throw new BadRequestException('This supervisor has reached their maximum group limit.');
    }

    // ── MUTEX: Check if student already has a pending project request ──────
    const pendingProjReq = await this.projectRequestRepo.findOne({
      where: { studentId, status: 'pending' },
    });
    if (pendingProjReq) {
      throw new BadRequestException(
        "You already have a pending request for a supervisor's project. Resolve it before sending a supervision request.",
      );
    }

    // Check if lead student is already in a group
    const leadInGroup = await this.groupsService.isStudentInGroup(studentId);
    if (leadInGroup) {
      throw new BadRequestException('You are already assigned to a group.');
    }

    // Check if any team member is already in a group
    if (memberStudentIds && memberStudentIds.length > 0) {
      for (const memberId of memberStudentIds) {
        const inGroup = await this.groupsService.isStudentInGroup(memberId);
        if (inGroup) {
          throw new BadRequestException(`Team member (ID: ${memberId}) is already in a group.`);
        }
      }
    }

    // Check duplicate request
    const exist = await this.requestRepo.findOne({
      where: { studentId, proposalId, supervisorId, status: 'pending' },
    });

    if (exist) {
      return { message: 'Request already sent' };
    }

    const request = this.requestRepo.create({
      studentId,
      proposalId,
      supervisorId,
      teamMembers: body.teamMembers || null,
      memberStudentIds: memberStudentIds || [],
      status: 'pending',
    });

    await this.requestRepo.save(request);
    return { message: 'Supervisor request sent successfully' };
  }

  // ── Get PENDING requests for a supervisor ──
  async getRequests(supervisorId: number) {
    return this.requestRepo.find({
      where: { supervisorId: Number(supervisorId), status: 'pending' },
      relations: ['proposal'],
      order: { createdAt: 'DESC' },
    });
  }

  // ── Supervisor accepts a request → creates group ──
  async acceptRequest(requestId: number) {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new BadRequestException('Request not found');
    if (request.status !== 'pending') throw new BadRequestException('Request already processed');

    // Check supervisor capacity
    const supervisor = await this.repo.findOne({ where: { id: request.supervisorId } });
    if (!supervisor) throw new BadRequestException('Supervisor not found');

    const groupCount = await this.groupsService.countGroupsForSupervisor(request.supervisorId);
    if (groupCount >= (supervisor.maxGroups || 3)) {
      throw new BadRequestException('You have reached your maximum group limit. Cancel some requests.');
    }

    // Check if group already exists for this request (prevent duplicates)
    const existingGroup = await this.groupRepo.findOne({
      where: {
        proposalId: request.proposalId,
        leadStudentId: request.studentId,
        supervisorId: request.supervisorId,
      },
    });
    if (existingGroup) {
      // Mark request accepted but don't create duplicate group
      request.status = 'accepted';
      await this.requestRepo.save(request);
      return { message: 'Request accepted (group already exists)', group: existingGroup };
    }

    // Mark this request as accepted
    request.status = 'accepted';
    await this.requestRepo.save(request);

    // Build student IDs array (lead + members)
    const allStudentIds = [request.studentId];
    if (request.memberStudentIds && request.memberStudentIds.length > 0) {
      allStudentIds.push(...request.memberStudentIds);
    }

    // Build student regs — lead first, then invited members
    // Look up the lead student's reg number
    const leadStudent = await this.studentRepo.findOne({ where: { id: request.studentId } });
    const leadReg = leadStudent?.regNo || `Student#${request.studentId}`;

    const memberRegs = request.teamMembers
      ? (Object.values(request.teamMembers) as string[]).filter(Boolean)
      : [];

    const studentRegs = [leadReg, ...memberRegs];

    // Create group
    const group = await this.groupRepo.save({
      proposalId: request.proposalId,
      supervisorId: request.supervisorId,
      leadStudentId: request.studentId,
      studentRegs,
      studentIds: allStudentIds,
      committeeId: null,
    });

    // Cancel all other pending requests from the same student (cross-supervisor cleanup)
    await this.requestRepo
      .createQueryBuilder()
      .update(SupervisorRequest)
      .set({ status: 'cancelled' })
      .where('studentId = :studentId AND id != :requestId AND status = :status', {
        studentId: request.studentId,
        requestId: request.id,
        status: 'pending',
      })
      .execute();

    // Also cancel pending requests from any team member
    if (request.memberStudentIds && request.memberStudentIds.length > 0) {
      for (const memberId of request.memberStudentIds) {
        await this.requestRepo
          .createQueryBuilder()
          .update(SupervisorRequest)
          .set({ status: 'cancelled' })
          .where('studentId = :studentId AND status = :status', {
            studentId: memberId,
            status: 'pending',
          })
          .execute();
      }
    }

    return {
      message: 'Request accepted, group created successfully',
      group,
    };
  }

  // ── Supervisor cancels/declines a request ──
  async cancelRequest(requestId: number) {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new BadRequestException('Request not found');

    request.status = 'cancelled';
    await this.requestRepo.save(request);

    return { message: 'Request cancelled' };
  }
}