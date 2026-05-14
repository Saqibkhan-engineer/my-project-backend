import { Test, TestingModule } from '@nestjs/testing';
import { ProposalEvaluationController } from './proposal-evaluation.controller';

describe('ProposalEvaluationController', () => {
  let controller: ProposalEvaluationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProposalEvaluationController],
    }).compile();

    controller = module.get<ProposalEvaluationController>(ProposalEvaluationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
