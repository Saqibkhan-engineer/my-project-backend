import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supervisor } from './entities/supervisor.entity';
import { SupervisorService } from './supervisor.service';
import { SupervisorController } from './supervisor.controller';
import { User } from 'src/users/entities/user.entity';
import { SupervisorRequest } from './entities/supervison.request.entity';
import { Group } from 'src/groups/entities/group.entity';
import { GroupsModule } from 'src/groups/groups.module';
import { Student } from 'src/students/entities/student.entity';
import { ProjectRequest } from 'src/project-request/entities/project-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supervisor, User, SupervisorRequest, Group, Student, ProjectRequest]),
    GroupsModule,
  ],
  controllers: [SupervisorController],
  providers: [SupervisorService],
  exports: [SupervisorService],
})
export class SupervisorModule {}