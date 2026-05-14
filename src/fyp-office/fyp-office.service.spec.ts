import { Test, TestingModule } from '@nestjs/testing';
import { FypOfficeService } from './fyp-office.service';

describe('FypOfficeService', () => {
  let service: FypOfficeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FypOfficeService],
    }).compile();

    service = module.get<FypOfficeService>(FypOfficeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
