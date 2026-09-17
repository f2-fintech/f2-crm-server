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
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';
import { FollowUpStatus } from './schemas/follow-up.schema';

@ApiTags('Follow Ups')
@Controller('follow-ups')
export class FollowUpsController {
  constructor(
    private readonly followUpsService: FollowUpsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create Follow Up',
  })
  @ApiResponse({
    status: 201,
    description: 'Follow Up created successfully.',
  })
  create(
    @Body() createFollowUpDto: CreateFollowUpDto,
  ) {
    return this.followUpsService.create(createFollowUpDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get All Follow Ups',
  })
  findAll(
    @Query() query: FollowUpQueryDto,
  ) {
    return this.followUpsService.findAll(query);
  }

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Follow Up Dashboard Statistics',
  })
  getDashboardStats() {
    return this.followUpsService.getDashboardStats();
  }

  @Get('today')
  @ApiOperation({
    summary: "Today's Follow Ups",
  })
  getTodayFollowUps() {
    return this.followUpsService.getTodayFollowUps();
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Upcoming Follow Ups',
  })
  getUpcomingFollowUps() {
    return this.followUpsService.getUpcomingFollowUps();
  }

  @Get('overdue')
  @ApiOperation({
    summary: 'Overdue Follow Ups',
  })
  getOverdueFollowUps() {
    return this.followUpsService.getOverdueFollowUps();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Follow Up By Id',
  })
  findOne(
    @Param('id') id: string,
  ) {
    return this.followUpsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update Follow Up',
  })
  update(
    @Param('id') id: string,
    @Body() updateFollowUpDto: UpdateFollowUpDto,
  ) {
    return this.followUpsService.update(
      id,
      updateFollowUpDto,
    );
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change Follow Up Status',
  })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: FollowUpStatus,
  ) {
    return this.followUpsService.changeStatus(
      id,
      status,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Follow Up',
  })
  remove(
    @Param('id') id: string,
  ) {
    return this.followUpsService.remove(id);
  }
}