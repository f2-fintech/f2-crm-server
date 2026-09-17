import { Module } from '@nestjs/common';
import { AiForecastService } from './ai-forecast.service';
import { AiForecastController } from './ai-forecast.controller';

@Module({
  controllers: [AiForecastController],
  providers: [AiForecastService],
})
export class AiForecastModule {}
