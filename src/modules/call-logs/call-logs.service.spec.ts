import { Test, TestingModule } from '@nestjs/testing';
import { CallLogsService } from './call-logs.service';

describe('CallLogsService', () => {
  let service: CallLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CallLogsService],
    }).compile();

    service = module.get<CallLogsService>(CallLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
