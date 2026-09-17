import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * Create Branch
   */
  @Post()
  async create(
    @Body() createBranchDto: CreateBranchDto,
  ) {
    return await this.branchesService.create(createBranchDto);
  }

  /**
   * Get All Branches
   */
  @Get()
  async findAll() {
    return await this.branchesService.findAll();
  }

  /**
   * Get Branch By Id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.branchesService.findOne(id);
  }

  /**
   * Update Branch
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return await this.branchesService.update(
      id,
      updateBranchDto,
    );
  }

  /**
   * Delete Branch
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.branchesService.remove(id);
  }
}