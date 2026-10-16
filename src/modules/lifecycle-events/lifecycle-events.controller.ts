import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LifecycleEventsService } from './lifecycle-events.service';
import { LifecycleQueryDto } from './dto/lifecycle-query.dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Lifecycle Events')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('lifecycle-events')
export class LifecycleEventsController {
  constructor(private readonly lifecycleEventsService: LifecycleEventsService) {}

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get lifecycle events for an entity' })
  getEvents(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: LifecycleQueryDto,
  ) {
    return this.lifecycleEventsService.getEvents(entityType, entityId, query);
  }

  @Get(':entityType/:entityId/timeline')
  @ApiOperation({ summary: 'Get combined timeline for an entity' })
  getTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.lifecycleEventsService.getTimeline(entityType, entityId);
  }

  @Get(':entityType/:entityId/current')
  @ApiOperation({ summary: 'Get current lifecycle summary for an entity' })
  getCurrentSummary(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.lifecycleEventsService.getCurrentSummary(entityType, entityId);
  }
}
