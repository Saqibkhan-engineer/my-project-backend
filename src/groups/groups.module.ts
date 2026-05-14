import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { SupervisorProposal } from '../supervisor-proposal/entities/supervisor-proposal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, Student, SupervisorProposal])],
  providers: [GroupsService],
  controllers: [GroupsController],
  exports: [GroupsService],
})
export class GroupsModule {}
