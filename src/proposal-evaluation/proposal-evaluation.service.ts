import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from '../proposal/entities/proposal.entity';

@Injectable()
export class ProposalEvaluationService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
  ) {}

 
  async submitToPec(proposalData: {
    title: string;
    description: string;
    domain: string;
    studentId: number;
    titleVec: number[];
    scopeVec: number[];
    modulesVec: number[];
    highestSimilarity: number;
  }) {
    const existing = await this.proposalRepo.findOne({
      where: { studentId: proposalData.studentId, status: 'submitted' },
    });

    if (existing) {
      throw new Error(
        'You already have a proposal under review. Please wait.',
      );
    }

    const proposal = this.proposalRepo.create({
      ...proposalData,
      fileUrl: '',
      status: 'submitted',
    });

    return this.proposalRepo.save(proposal);
  }

  async approveProposal(id: number, feedback?: string) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'approved';
    proposal.pecFeedback =
      feedback || 'Proposal approved. Proceed further.';

    return this.proposalRepo.save(proposal);
  }

  async rejectProposal(id: number, feedback?: string) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'rejected';
    proposal.pecFeedback = feedback || 'Proposal rejected.';

    return this.proposalRepo.save(proposal);
  }

  async getSubmittedProposals() {
    return this.proposalRepo.find({
      where: { status: 'submitted' },
      relations: ['student', 'student.user'],
      order: { createdAt: 'DESC' },
    });
  }
}
