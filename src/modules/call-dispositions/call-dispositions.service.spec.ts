import { Test, TestingModule } from '@nestjs/testing';
import { CallDispositionsService } from './call-dispositions.service';

describe('CallDispositionsService', () => {
  let service: CallDispositionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CallDispositionsService],
    }).compile();

    service = module.get<CallDispositionsService>(CallDispositionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
