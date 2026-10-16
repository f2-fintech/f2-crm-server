import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StageHistoryService } from './stage-history.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Stage History')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('stage-history')
export class StageHistoryController {
  constructor(private readonly stageHistoryService: StageHistoryService) {}

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get stage history progression for an entity' })
  getStageHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.stageHistoryService.getStageHistory(entityType, entityId);
  }
}
