import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectRequest } from './entities/project-request.entity';
import { ProjectRequestService } from './project-request.service';
import { ProjectRequestController } from './project-request.controller';
import { Group } from '../groups/entities/group.entity';
import { SupervisorRequest } from '../supervisor/entities/supervison.request.entity';
import { Student } from '../students/entities/student.entity';
import { Supervisor } from '../supervisor/entities/supervisor.entity';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectRequest, Group, SupervisorRequest, Student, Supervisor]),
    GroupsModule,
  ],
  providers: [ProjectRequestService],
  controllers: [ProjectRequestController],
  exports: [ProjectRequestService],
})
export class ProjectRequestModule {}
