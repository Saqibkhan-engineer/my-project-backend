import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommitteeController } from './committee.controller';
import { CommitteeService } from './committee.service';
import { Committee } from './entities/committee.entity';
import { Supervisor } from '../supervisor/entities/supervisor.entity';
import { Group } from '../groups/entities/group.entity';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Committee, Supervisor, Group, Student, User]),
    EmailModule,
  ],
  controllers: [CommitteeController],
  providers: [CommitteeService],
  exports: [CommitteeService],
})
export class CommitteeModule {}
