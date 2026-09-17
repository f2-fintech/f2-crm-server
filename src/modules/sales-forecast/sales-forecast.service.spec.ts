import { Test, TestingModule } from '@nestjs/testing';
import { SalesForecastService } from './sales-forecast.service';

describe('SalesForecastService', () => {
  let service: SalesForecastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesForecastService],
    }).compile();

    service = module.get<SalesForecastService>(SalesForecastService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
