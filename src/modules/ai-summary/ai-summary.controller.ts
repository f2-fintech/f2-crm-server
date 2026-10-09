import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AiSummaryService } from './ai-summary.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('AI Summary')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ai-summary')
export class AiSummaryController {
  constructor(private readonly aiSummaryService: AiSummaryService) {}

  @Get('lead/:id')
  @ApiOperation({ summary: 'Get AI generated summary for a specific lead' })
  getLeadSummary(@Param('id') id: string) {
    return this.aiSummaryService.getLeadSummary(id);
  }
}
