import { Module } from '@nestjs/common';
import { AiAgentsService } from './ai-agents.service';
import { AiAgentsController } from './ai-agents.controller';

@Module({
  controllers: [AiAgentsController],
  providers: [AiAgentsService],
})
export class AiAgentsModule {}
