import { Test, TestingModule } from '@nestjs/testing';
import { StageHistoryController } from './stage-history.controller';
import { StageHistoryService } from './stage-history.service';

describe('StageHistoryController', () => {
  let controller: StageHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StageHistoryController],
      providers: [{ provide: StageHistoryService, useValue: {} }]
    }).compile();

    controller = module.get<StageHistoryController>(StageHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});