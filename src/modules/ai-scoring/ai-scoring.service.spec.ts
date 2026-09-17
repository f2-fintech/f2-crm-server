import { Test, TestingModule } from '@nestjs/testing';
import { AiScoringService } from './ai-scoring.service';

describe('AiScoringService', () => {
  let service: AiScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiScoringService],
    }).compile();

    service = module.get<AiScoringService>(AiScoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
