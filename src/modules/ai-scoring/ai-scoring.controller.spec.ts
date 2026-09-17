import { Test, TestingModule } from '@nestjs/testing';
import { AiScoringController } from './ai-scoring.controller';
import { AiScoringService } from './ai-scoring.service';

describe('AiScoringController', () => {
  let controller: AiScoringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiScoringController],
      providers: [AiScoringService],
    }).compile();

    controller = module.get<AiScoringController>(AiScoringController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
