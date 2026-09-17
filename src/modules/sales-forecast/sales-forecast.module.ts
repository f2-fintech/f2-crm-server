import { Module } from '@nestjs/common';
import { SalesForecastService } from './sales-forecast.service';
import { SalesForecastController } from './sales-forecast.controller';

@Module({
  controllers: [SalesForecastController],
  providers: [SalesForecastService],
})
export class SalesForecastModule {}
