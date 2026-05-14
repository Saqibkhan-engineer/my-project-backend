import { Module } from '@nestjs/common';
import { FypOfficeController } from './fyp-office.controller';
import { FypOfficeService } from './fyp-office.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExistingProject } from 'src/proposal/entities/existing-project.entity';

@Module({
  imports:[TypeOrmModule.forFeature([ExistingProject])],
  controllers: [FypOfficeController],
  providers: [FypOfficeService]
})
export class FypOfficeModule {}
