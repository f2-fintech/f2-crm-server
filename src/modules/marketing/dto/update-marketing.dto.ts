import { PartialType } from '@nestjs/swagger';
import { CreateMarketingDto } from './create-marketing.dto';

export class UpdateMarketingDto extends PartialType(CreateMarketingDto) {}
