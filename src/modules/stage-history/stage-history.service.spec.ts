import { Test, TestingModule } from '@nestjs/testing';
import { StageHistoryService } from './stage-history.service';
import { getModelToken } from '@nestjs/mongoose';
import { StageHistory } from './schemas/stage-history.schema';

describe('StageHistoryService', () => {
  let service: StageHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StageHistoryService,
        {
          provide: getModelToken(StageHistory.name),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<StageHistoryService>(StageHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
