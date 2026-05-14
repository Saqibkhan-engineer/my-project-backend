import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { StudentsModule } from '../students/students.module';
import { SupervisorModule } from '../supervisor/supervisor.module';

@Module({
  imports: [UsersModule, StudentsModule, SupervisorModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
