import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentsService } from './ai-agents.service';

describe('AiAgentsService', () => {
  let service: AiAgentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiAgentsService],
    }).compile();

    service = module.get<AiAgentsService>(AiAgentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
