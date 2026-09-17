import { PartialType } from '@nestjs/swagger';
import { CreateAiForecastDto } from './create-ai-forecast.dto';

export class UpdateAiForecastDto extends PartialType(CreateAiForecastDto) {}
