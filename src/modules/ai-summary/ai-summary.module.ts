import { Module } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';
import { AiSummaryController } from './ai-summary.controller';
import { LeadsModule } from '../leads/leads.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [LeadsModule, ConfigModule],
  controllers: [AiSummaryController],
  providers: [AiSummaryService],
})
export class AiSummaryModule {}
