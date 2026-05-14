import { Controller, Post, Body, Param, Get, Patch } from '@nestjs/common';
import { ProposalEvaluationService } from './proposal-evaluation.service';

@Controller('pec')
export class ProposalEvaluationController {
  constructor(private readonly pecService: ProposalEvaluationService) {}

  @Post('submit-to-pec')
  submit(@Body() body: any) {
    console.log('proposal recieved')
    return this.pecService.submitToPec(body);
  }

  @Patch('approve/:id')
  approve(@Param('id') id: number, @Body('feedback') feedback: string) {
    return this.pecService.approveProposal(id, feedback);
  }

  @Patch('reject/:id')
  reject(@Param('id') id: number, @Body('feedback') feedback: string) {
    return this.pecService.rejectProposal(id, feedback);
  }

  @Get('submitted')
  getSubmitted() {
    return this.pecService.getSubmittedProposals();
  }
}
