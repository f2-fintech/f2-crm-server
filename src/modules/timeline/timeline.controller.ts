import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';

import { TimelineService } from './timeline.service';
import { TimelineQueryDto } from './dto/timeline-query.dto';

@Controller('timeline')
export class TimelineController {
  constructor(
    private readonly timelineService: TimelineService,
  ) {}

  /**
   * Get All Timeline
   */
  @Get()
  findAll(
    @Query()
    query: TimelineQueryDto,
  ) {
    return this.timelineService.findAll(query);
  }

  /**
   * Get Lead Timeline
   */
  @Get('lead/:leadId')
  getLeadTimeline(
    @Param('leadId')
    leadId: string,
  ) {
    return this.timelineService.getLeadTimeline(
      leadId,
    );
  }

  /**
   * Get Customer Timeline
   */
  @Get('customer/:customerId')
  getCustomerTimeline(
    @Param('customerId')
    customerId: string,
  ) {
    return this.timelineService.getCustomerTimeline(
      customerId,
    );
  }

  /**
   * Get Application Timeline
   */
  @Get('application/:applicationId')
  getApplicationTimeline(
    @Param('applicationId')
    applicationId: string,
  ) {
    return this.timelineService.getApplicationTimeline(
      applicationId,
    );
  }

  /**
   * Dashboard Statistics
   */
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.timelineService.getDashboardStats();
  }
}