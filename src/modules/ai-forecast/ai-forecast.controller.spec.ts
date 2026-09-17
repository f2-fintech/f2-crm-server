import { Test, TestingModule } from '@nestjs/testing';
import { AiForecastController } from './ai-forecast.controller';
import { AiForecastService } from './ai-forecast.service';

describe('AiForecastController', () => {
  let controller: AiForecastController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiForecastController],
      providers: [AiForecastService],
    }).compile();

    controller = module.get<AiForecastController>(AiForecastController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
