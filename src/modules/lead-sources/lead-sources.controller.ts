import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadSourcesService } from './lead-sources.service';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';

@Controller('lead-sources')
export class LeadSourcesController {
  constructor(private readonly leadSourcesService: LeadSourcesService) {}

  @Post()
  create(@Body() createLeadSourceDto: CreateLeadSourceDto) {
    return this.leadSourcesService.create(createLeadSourceDto);
  }

  @Get()
  findAll() {
    return this.leadSourcesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadSourcesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadSourceDto: UpdateLeadSourceDto) {
    return this.leadSourcesService.update(+id, updateLeadSourceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadSourcesService.remove(+id);
  }
}
