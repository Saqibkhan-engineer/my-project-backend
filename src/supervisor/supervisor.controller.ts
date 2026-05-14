import { Controller, Post, Patch, Body, Get, Param } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';

@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly service: SupervisorService) {}

  // Get all supervisors (for student to browse)
  @Get('all')
  getAllSupervisors() {
    console.log('supervisor api called');
    return this.service.getAllSupervisors();
  }

  // Student sends a supervisor request
  @Post('send-supervisor-request')
  sendSupervisorRequest(@Body() body: any) {
    console.log('send supervisor request:', body);
    return this.service.sendSupervisorRequest(body);
  }

  // Get pending requests for a supervisor
  @Get('requests/:supervisorId')
  getRequests(@Param('supervisorId') supervisorId: number) {
    console.log('get pending requests for supervisor:', supervisorId);
    return this.service.getRequests(supervisorId);
  }

  // Supervisor accepts a student request
  @Patch('accept-request/:id')
  async acceptRequest(@Param('id') id: number) {
    return this.service.acceptRequest(Number(id));
  }

  // Supervisor cancels/declines a request
  @Patch('cancel-request/:id')
  async cancelRequest(@Param('id') id: number) {
    return this.service.cancelRequest(Number(id));
  }
}