import { Module } from '@nestjs/common';
import { AiFollowupsService } from './ai-followups.service';
import { AiFollowupsController } from './ai-followups.controller';

@Module({
  controllers: [AiFollowupsController],
  providers: [AiFollowupsService],
})
export class AiFollowupsModule {}
