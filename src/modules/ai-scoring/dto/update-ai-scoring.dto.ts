import { PartialType } from '@nestjs/swagger';
import { CreateAiScoringDto } from './create-ai-scoring.dto';

export class UpdateAiScoringDto extends PartialType(CreateAiScoringDto) {}
