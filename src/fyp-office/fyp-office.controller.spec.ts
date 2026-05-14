import { Test, TestingModule } from '@nestjs/testing';
import { FypOfficeController } from './fyp-office.controller';

describe('FypOfficeController', () => {
  let controller: FypOfficeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FypOfficeController],
    }).compile();

    controller = module.get<FypOfficeController>(FypOfficeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
