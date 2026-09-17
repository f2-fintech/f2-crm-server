import { PartialType } from '@nestjs/swagger';
import { CreateAiSummaryDto } from './create-ai-summary.dto';

export class UpdateAiSummaryDto extends PartialType(CreateAiSummaryDto) {}
