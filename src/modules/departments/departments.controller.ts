import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  /**
   * Create Department
   */
  @Post()
  async create(
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return await this.departmentsService.create(createDepartmentDto);
  }

  /**
   * Get All Departments
   */
  @Get()
  async findAll() {
    return await this.departmentsService.findAll();
  }

  /**
   * Get Department By Id
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return await this.departmentsService.findOne(id);
  }

  /**
   * Update Department
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return await this.departmentsService.update(
      id,
      updateDepartmentDto,
    );
  }

  /**
   * Delete Department
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ) {
    return await this.departmentsService.remove(id);
  }
}