import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupervisorProposal } from './entities/supervisor-proposal.entity';
import { Supervisor } from '../supervisor/entities/supervisor.entity';
import { Group } from '../groups/entities/group.entity';
import { SupervisorProposalService } from './supervisor-proposal.service';
import { SupervisorProposalController } from './supervisor-proposal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupervisorProposal, Supervisor, Group])],
  providers: [SupervisorProposalService],
  controllers: [SupervisorProposalController],
  exports: [SupervisorProposalService],
})
export class SupervisorProposalModule {}
