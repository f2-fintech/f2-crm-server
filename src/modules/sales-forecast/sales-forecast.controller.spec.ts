import { Test, TestingModule } from '@nestjs/testing';
import { SalesForecastController } from './sales-forecast.controller';
import { SalesForecastService } from './sales-forecast.service';

describe('SalesForecastController', () => {
  let controller: SalesForecastController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesForecastController],
      providers: [SalesForecastService],
    }).compile();

    controller = module.get<SalesForecastController>(SalesForecastController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
