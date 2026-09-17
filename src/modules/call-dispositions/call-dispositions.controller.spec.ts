import { Test, TestingModule } from '@nestjs/testing';
import { CallDispositionsController } from './call-dispositions.controller';
import { CallDispositionsService } from './call-dispositions.service';

describe('CallDispositionsController', () => {
  let controller: CallDispositionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallDispositionsController],
      providers: [CallDispositionsService],
    }).compile();

    controller = module.get<CallDispositionsController>(CallDispositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
