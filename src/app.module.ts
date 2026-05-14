import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentsModule } from './students/students.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/typeOrm.config';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ProposalModule } from './proposal/proposal.module';
import { MulterModule } from '@nestjs/platform-express';
import { GeminiModule } from './gemini/gemini.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ProposalEvaluationModule } from './proposal-evaluation/proposal-evaluation.module';
import { FypOfficeModule } from './fyp-office/fyp-office.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { ChatModule } from './chat/chat.module';
import { GroupsModule } from './groups/groups.module';
import { CommitteeModule } from './committee/committee.module';
import { EmailModule } from './email/email.module';
import { SupervisorProposalModule } from './supervisor-proposal/supervisor-proposal.module';
import { ProjectRequestModule } from './project-request/project-request.module';
import * as multer from 'multer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    MulterModule.register({
      storage: multer.memoryStorage(),
    }),
    UsersModule,
    StudentsModule,
    AuthModule,
    ProposalModule,
    GeminiModule,
    ProposalEvaluationModule,
    FypOfficeModule,
    SupervisorModule,
    ChatModule,
    GroupsModule,
    CommitteeModule,
    EmailModule,
    SupervisorProposalModule,
    ProjectRequestModule,
  ],
  controllers: [AppController,],
  providers: [AppService],
})
export class AppModule { }
