import { PartialType } from '@nestjs/swagger';
import { CreateSalesForecastDto } from './create-sales-forecast.dto';

export class UpdateSalesForecastDto extends PartialType(CreateSalesForecastDto) {}
