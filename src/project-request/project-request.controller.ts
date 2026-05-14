import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ProjectRequestService } from './project-request.service';

@Controller('project-request')
export class ProjectRequestController {
  constructor(private readonly service: ProjectRequestService) {}

  // Student sends request for a supervisor's approved project
  @Post('send')
  send(@Body() body: any) {
    return this.service.send(body);
  }

  // Supervisor sees pending project requests for their proposals
  @Get('supervisor/:supervisorId')
  getForSupervisor(@Param('supervisorId') supervisorId: number) {
    return this.service.getForSupervisor(Number(supervisorId));
  }

  // Student checks their latest project request status
  @Get('student/:studentId')
  getMyRequest(@Param('studentId') studentId: number) {
    return this.service.getMyRequest(Number(studentId));
  }

  // Supervisor accepts a project request
  @Patch('accept/:id')
  accept(@Param('id') id: number) {
    return this.service.accept(Number(id));
  }

  // Supervisor rejects a project request
  @Patch('reject/:id')
  reject(@Param('id') id: number) {
    return this.service.reject(Number(id));
  }
}
