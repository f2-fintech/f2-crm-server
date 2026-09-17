import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Create Permission
   */
  @Post()
  async create(
    @Body() createPermissionDto: CreatePermissionDto,
  ) {
    return await this.permissionsService.create(createPermissionDto);
  }

  /**
   * Get All Permissions
   */
  @Get()
  async findAll() {
    return await this.permissionsService.findAll();
  }

  /**
   * Get Permission By Id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.permissionsService.findOne(id);
  }

  /**
   * Update Permission
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return await this.permissionsService.update(
      id,
      updatePermissionDto,
    );
  }

  /**
   * Delete Permission
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.permissionsService.remove(id);
  }
}