import { Module } from '@nestjs/common';
import { ProposalEvaluationController } from './proposal-evaluation.controller';
import { ProposalEvaluationService } from './proposal-evaluation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from 'src/proposal/entities/proposal.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Proposal])],
  controllers: [ProposalEvaluationController],
  providers: [ProposalEvaluationService]
})
export class ProposalEvaluationModule {}
