import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DriveAllocationService } from './drive-allocation.service';
import { AllocateRecordsDto, PreviewRecordsDto } from './dto/allocate-records.dto';
import {
  ReassignRecordsDto,
  ReturnRecordsDto,
  ConfigureDriveDto,
} from './dto/drive-actions.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Drive Data Allocation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('drive-allocation')
export class DriveAllocationController {
  constructor(
    private readonly driveAllocationService: DriveAllocationService,
  ) {}

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get list of discovered Google Drive files' })
  @Get('files')
  async getFiles() {
    return await this.driveAllocationService.getFilesList();
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Re-scan Google Drive folder hierarchy' })
  @Post('scan')
  async scanFolder(@Body() body: ConfigureDriveDto) {
    return await this.driveAllocationService.scanDriveFolder(body?.folderUrl);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Sync and ingest spreadsheet rows for a file' })
  @Post('sync/:fileId')
  async syncFile(@Param('fileId') fileId: string) {
    return await this.driveAllocationService.syncFileRecords(fileId);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get Managers and their reporting Employees' })
  @Get('hierarchy')
  async getHierarchy() {
    return await this.driveAllocationService.getManagerHierarchy();
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get Notion sheets/files assigned to an Employee' })
  @Get('employee-sheets/:employeeId')
  async getEmployeeSheets(@Param('employeeId') employeeId: string) {
    return await this.driveAllocationService.getEmployeeSheets(employeeId);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get dynamic filter options (Cities, States, Years, Amount range) for a file' })
  @Get('filter-options/:fileId')
  async getFilterOptions(@Param('fileId') fileId: string) {
    return await this.driveAllocationService.getFileFilterOptions(fileId);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Search unique values for a column directly from backend' })
  @Get('column-values/:fileId')
  async searchColumnValues(
    @Param('fileId') fileId: string,
    @Query('column') column: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return await this.driveAllocationService.searchColumnValues(
      fileId,
      column,
      search,
      limit,
    );
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get Available unallocated records for a file' })
  @Get('available/:fileId')
  async getAvailableRecords(
    @Param('fileId') fileId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('year') year?: string,
    @Query('category') category?: string,
    @Query('cibilMin') cibilMin?: number,
    @Query('lender') lender?: string,
    @Query('customColumn') customColumn?: string,
    @Query('customValue') customValue?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('filters') filters?: string,
  ) {
    return await this.driveAllocationService.getAvailableRecords(fileId, {
      page,
      limit,
      search,
      city,
      state,
      year,
      category,
      cibilMin,
      lender,
      customColumn,
      customValue,
      minAmount,
      maxAmount,
      filters,
    });
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get Allocated records with filters' })
  @Get('allocated')
  async getAllocatedRecords(
    @Query('fileId') fileId?: string,
    @Query('managerId') managerId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.driveAllocationService.getAllocatedRecords({
      fileId,
      managerId,
      employeeId,
      search,
      page,
      limit,
    });
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Preview records to be allocated with balanced state distribution',
  })
  @Post('preview')
  async previewRecords(@Body() dto: PreviewRecordsDto) {
    return await this.driveAllocationService.previewRecords(dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Allocate data records to selected Manager and Employee',
  })
  @Post('allocate')
  async allocate(@Body() dto: AllocateRecordsDto, @Req() req: any) {
    return await this.driveAllocationService.allocateRecords(dto, req.user);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Return allocated records back to source file' })
  @Post('return')
  async returnToFile(@Body() dto: ReturnRecordsDto, @Req() req: any) {
    return await this.driveAllocationService.returnRecordsToFile(dto, req.user);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Reassign allocated records to another employee' })
  @Post('reassign')
  async reassign(@Body() dto: ReassignRecordsDto, @Req() req: any) {
    return await this.driveAllocationService.reassignRecords(dto, req.user);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get permanent Allocation Audit History logs' })
  @Get('history')
  async getHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('employeeId') employeeId?: string,
    @Query('fileId') fileId?: string,
    @Query('search') search?: string,
  ) {
    return await this.driveAllocationService.getAllocationHistory({
      page,
      limit,
      action,
      employeeId,
      fileId,
      search,
    });
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get overall drive allocation statistics' })
  @Get('stats')
  async getStats() {
    return await this.driveAllocationService.getStats();
  }
}
