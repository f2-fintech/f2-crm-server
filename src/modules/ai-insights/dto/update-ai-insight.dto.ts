import { PartialType } from '@nestjs/swagger';
import { CreateAiInsightDto } from './create-ai-insight.dto';

export class UpdateAiInsightDto extends PartialType(CreateAiInsightDto) {}
