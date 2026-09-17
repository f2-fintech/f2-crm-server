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

import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { ApplicationStatus } from './schemas/application.schema';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create Application',
  })
  @ApiResponse({
    status: 201,
    description: 'Application created successfully.',
  })
  create(
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get All Applications',
  })
  findAll(
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applicationsService.findAll(query);
  }

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Application Dashboard Statistics',
  })
  getDashboardStats() {
    return this.applicationsService.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Application By Id',
  })
  findOne(
    @Param('id') id: string,
  ) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update Application',
  })
  update(
    @Param('id') id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(
      id,
      updateApplicationDto,
    );
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change Application Status',
  })
  changeStatus(
    @Param('id') id: string,
    @Body('status') status: ApplicationStatus,
  ) {
    return this.applicationsService.changeStatus(
      id,
      status,
    );
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Assign Application',
  })
  assignApplication(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    return this.applicationsService.assignApplication(
      id,
      assignedTo,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Application',
  })
  remove(
    @Param('id') id: string,
  ) {
    return this.applicationsService.remove(id);
  }
}