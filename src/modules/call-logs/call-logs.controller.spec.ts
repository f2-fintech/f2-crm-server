import { Test, TestingModule } from '@nestjs/testing';
import { CallLogsController } from './call-logs.controller';
import { CallLogsService } from './call-logs.service';

describe('CallLogsController', () => {
  let controller: CallLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallLogsController],
      providers: [CallLogsService],
    }).compile();

    controller = module.get<CallLogsController>(CallLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
