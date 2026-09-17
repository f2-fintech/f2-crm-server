import { Test, TestingModule } from '@nestjs/testing';
import { AiFollowupsService } from './ai-followups.service';

describe('AiFollowupsService', () => {
  let service: AiFollowupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiFollowupsService],
    }).compile();

    service = module.get<AiFollowupsService>(AiFollowupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
