import { Module } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';
import { AiScoringController } from './ai-scoring.controller';

@Module({
  controllers: [AiScoringController],
  providers: [AiScoringService],
})
export class AiScoringModule {}
