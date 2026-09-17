import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ActivitiesService } from './activities.service';

import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';

import { ActivityStatus } from './schema/activity.schema';

@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  /**
   * Create Activity
   */
  @Post()
  create(
    @Body()
    createActivityDto: CreateActivityDto,
  ) {
    return this.activitiesService.create(
      createActivityDto,
    );
  }

  /**
   * Get All Activities
   */
  @Get()
  findAll(
    @Query()
    query: ActivityQueryDto,
  ) {
    return this.activitiesService.findAll(query);
  }

  /**
   * Dashboard Statistics
   */
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.activitiesService.getDashboardStats();
  }

  /**
   * Today's Activities
   */
  @Get('today')
  getTodayActivities() {
    return this.activitiesService.getTodayActivities();
  }

  /**
   * Upcoming Activities
   */
  @Get('upcoming')
  getUpcomingActivities() {
    return this.activitiesService.getUpcomingActivities();
  }

  /**
   * Lead Activities
   */
  @Get('lead/:leadId')
  getLeadActivities(
    @Param('leadId')
    leadId: string,
  ) {
    return this.activitiesService.getLeadActivities(
      leadId,
    );
  }

  /**
   * Get Activity By Id
   */
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.activitiesService.findOne(id);
  }

  /**
   * Update Activity
   */
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(
      id,
      updateActivityDto,
    );
  }

  /**
   * Change Status
   */
  @Patch(':id/status')
  changeStatus(
    @Param('id')
    id: string,

    @Body('status')
    status: ActivityStatus,
  ) {
    return this.activitiesService.changeStatus(
      id,
      status,
    );
  }

  /**
   * Delete Activity
   */
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.activitiesService.remove(id);
  }
}