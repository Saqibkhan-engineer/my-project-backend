import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupervisorProposal } from './entities/supervisor-proposal.entity';
import { Supervisor } from '../supervisor/entities/supervisor.entity';
import { Group } from '../groups/entities/group.entity';

@Injectable()
export class SupervisorProposalService {
  constructor(
    @InjectRepository(SupervisorProposal)
    private readonly repo: Repository<SupervisorProposal>,

    @InjectRepository(Supervisor)
    private readonly supervisorRepo: Repository<Supervisor>,

    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
  ) {}

  // ── Supervisor submits a new idea ─────────────────────────────────────────
  async submit(supervisorId: number, dto: {
    title: string;
    scope?: string;
    modules?: string[];
    domain?: string;
  }) {
    const supervisor = await this.supervisorRepo.findOne({ where: { id: supervisorId } });
    if (!supervisor) throw new BadRequestException('Supervisor not found');

    const proposal = this.repo.create({
      supervisorId,
      title: dto.title,
      scope: dto.scope || '',
      modules: dto.modules || [],
      domain: dto.domain || '',
      status: 'submitted',
    });
    return this.repo.save(proposal);
  }

  // ── Supervisor resubmits after revision request ───────────────────────────
  async resubmit(id: number, supervisorId: number, dto: {
    title?: string;
    scope?: string;
    modules?: string[];
    domain?: string;
  }) {
    const proposal = await this.repo.findOne({ where: { id } });
    if (!proposal) throw new BadRequestException('Proposal not found');
    if (proposal.supervisorId !== supervisorId) throw new BadRequestException('Not your proposal');
    if (proposal.status !== 'revision') throw new BadRequestException('Only revision proposals can be resubmitted');

    proposal.title = dto.title ?? proposal.title;
    proposal.scope = dto.scope ?? proposal.scope;
    proposal.modules = dto.modules ?? proposal.modules;
    proposal.domain = dto.domain ?? proposal.domain;
    proposal.status = 'submitted';
    proposal.pecFeedback = null;

    return this.repo.save(proposal);
  }

  // ── Supervisor sees their own proposals ───────────────────────────────────
  async getMy(supervisorId: number) {
    return this.repo.find({
      where: { supervisorId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── PEC sees all submitted proposals ─────────────────────────────────────
  async getSubmitted() {
    const all = await this.repo.find({
      where: { status: 'submitted' },
      relations: ['supervisor', 'supervisor.user'],
      order: { createdAt: 'DESC' },
    });
    return all.map(p => ({
      ...p,
      supervisorName: p.supervisor?.user?.name || '',
      supervisorEmail: p.supervisor?.user?.email || '',
    }));
  }

  // ── Students browse all PEC-approved supervisor proposals ─────────────────
  async getApproved() {
    const all = await this.repo.find({
      where: { status: 'approved' },
      relations: ['supervisor', 'supervisor.user'],
      order: { createdAt: 'DESC' },
    });

    // Check which proposals already have groups (taken)
    const takenIds = new Set<number>();
    if (all.length > 0) {
      const groups = await this.groupRepo.find({
        select: ['supervisorProposalId'],
      });
      groups.forEach(g => { if (g.supervisorProposalId) takenIds.add(g.supervisorProposalId); });
    }

    return all.map(p => ({
      id: p.id,
      title: p.title,
      scope: p.scope,
      modules: p.modules,
      domain: p.domain,
      createdAt: p.createdAt,
      supervisorId: p.supervisorId,
      supervisorName: p.supervisor?.user?.name || '',
      supervisorDesignation: p.supervisor?.designation || '',
      supervisorExpertise: p.supervisor?.expertise || [],
      taken: takenIds.has(p.id),
    }));
  }

  // ── PEC approves a supervisor proposal ───────────────────────────────────
  async approve(id: number, feedback?: string) {
    const proposal = await this.repo.findOne({ where: { id } });
    if (!proposal) throw new BadRequestException('Proposal not found');
    proposal.status = 'approved';
    proposal.pecFeedback = feedback || 'Approved by PEC.';
    return this.repo.save(proposal);
  }

  // ── PEC requests revision ────────────────────────────────────────────────
  async requestRevision(id: number, feedback: string) {
    if (!feedback) throw new BadRequestException('Feedback is required for revision');
    const proposal = await this.repo.findOne({ where: { id } });
    if (!proposal) throw new BadRequestException('Proposal not found');
    proposal.status = 'revision';
    proposal.pecFeedback = feedback;
    return this.repo.save(proposal);
  }
}
