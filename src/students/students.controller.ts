import { Controller, Get } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('all')
  findAll() {
    return this.studentsService.findAll();
  }

  @Get('available')
  findAvailable() {
    return this.studentsService.findAvailable();
  }
}
