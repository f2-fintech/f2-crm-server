import { Test, TestingModule } from '@nestjs/testing';
import { AiForecastService } from './ai-forecast.service';

describe('AiForecastService', () => {
  let service: AiForecastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiForecastService],
    }).compile();

    service = module.get<AiForecastService>(AiForecastService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
