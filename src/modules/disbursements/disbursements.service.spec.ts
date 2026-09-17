import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementsService } from './disbursements.service';

describe('DisbursementsService', () => {
  let service: DisbursementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DisbursementsService],
    }).compile();

    service = module.get<DisbursementsService>(DisbursementsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
