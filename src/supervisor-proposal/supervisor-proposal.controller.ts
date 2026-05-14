import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { SupervisorProposalService } from './supervisor-proposal.service';

@Controller('supervisor-proposal')
export class SupervisorProposalController {
  constructor(private readonly service: SupervisorProposalService) {}

  // Supervisor submits a new idea
  @Post('submit')
  submit(@Body() body: { supervisorId: number; title: string; scope?: string; modules?: string[]; domain?: string }) {
    return this.service.submit(Number(body.supervisorId), body);
  }

  // Supervisor resubmits after revision
  @Patch('resubmit/:id')
  resubmit(@Param('id') id: number, @Body() body: { supervisorId: number; title?: string; scope?: string; modules?: string[]; domain?: string }) {
    return this.service.resubmit(Number(id), Number(body.supervisorId), body);
  }

  // Supervisor sees their own proposals
  @Get('my/:supervisorId')
  getMy(@Param('supervisorId') supervisorId: number) {
    return this.service.getMy(Number(supervisorId));
  }

  // PEC: all submitted supervisor proposals
  @Get('submitted')
  getSubmitted() {
    return this.service.getSubmitted();
  }

  // Students: browse all approved supervisor proposals
  @Get('approved')
  getApproved() {
    return this.service.getApproved();
  }

  // PEC approves
  @Patch('approve/:id')
  approve(@Param('id') id: number, @Body('feedback') feedback?: string) {
    return this.service.approve(Number(id), feedback);
  }

  // PEC requests revision
  @Patch('revise/:id')
  revise(@Param('id') id: number, @Body('feedback') feedback: string) {
    return this.service.requestRevision(Number(id), feedback);
  }
}
