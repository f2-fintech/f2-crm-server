import { Test, TestingModule } from '@nestjs/testing';
import { AiFollowupsController } from './ai-followups.controller';
import { AiFollowupsService } from './ai-followups.service';

describe('AiFollowupsController', () => {
  let controller: AiFollowupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiFollowupsController],
      providers: [AiFollowupsService],
    }).compile();

    controller = module.get<AiFollowupsController>(AiFollowupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
