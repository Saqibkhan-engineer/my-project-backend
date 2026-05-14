import { Controller, Post, UseInterceptors, Get, Body, Param, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { ProposalService } from './proposal.service';

@Controller('proposal')
export class ProposalController {
  constructor(private proposalservice: ProposalService) { }

  @Get('all')
  fetchAllProposals() {
    return this.proposalservice.fetchAllProposals();
  }



  @Get('student/:studentId')
  getStudentProposal(@Param('studentId') studentId: string) {
    return this.proposalservice.getStudentProposal(parseInt(studentId));
  }

  // Check similarity only - does NOT save to database
  @Post('check-similarity')
  @UseInterceptors(FileInterceptor('file'))
  async checkSimilarity(
    @Body() body,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('🚀 ProposalController: checkSimilarity called', file?.originalname);
    try {
      const studentId = body.studentId ? parseInt(body.studentId) : undefined;
      return await this.proposalservice.checkSimilarity(body, file, studentId);
    } catch (error) {
      console.error('❌ checkSimilarity error:', error.message);
     
      return {
        success: false,
        error: error.message || 'Similarity check failed',
      };
    }
  }

  @Post('enhance')
  async enhanceProposal(@Body() body: {
    title: string;
    description: string;
    scope?: string;
    modules?: string | string[];
  }) {
    console.log('🚀 ProposalController: enhanceProposal called');
    console.log('📝 Received data:', {
      title: body.title?.substring(0, 50),
      description: body.description?.substring(0, 50),
      scopeLength: body.scope?.length || 0,
      modulesType: typeof body.modules,
      modules: Array.isArray(body.modules) ? body.modules.length + ' items' : body.modules?.substring?.(0, 50),
    });
    return this.proposalservice.enhanceProposalWithGemini(body);
  }

  // Submit proposal to PEC - receives full proposal data and saves to DB with status='submitted'
}


