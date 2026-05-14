import { Test, TestingModule } from '@nestjs/testing';
import { ProposalEvaluationService } from './proposal-evaluation.service';

describe('ProposalEvaluationService', () => {
  let service: ProposalEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProposalEvaluationService],
    }).compile();

    service = module.get<ProposalEvaluationService>(ProposalEvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
