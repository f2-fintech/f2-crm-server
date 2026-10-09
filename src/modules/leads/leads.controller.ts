import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: any) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @Patch(':id/documents')
  addDocument(
    @Param('id') id: string,
    @Body() body: { type: string; url: string },
  ) {
    return this.leadsService.addDocument(id, body);
  }

  @Post(':id/convert')
  convertToCustomer(@Param('id') id: string) {
    return this.leadsService.convertToCustomer(id);
  }
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.leadsService.getDashboardStats();
  }

  @Post('sync-oms')
  syncOmsLeads() {
    return this.leadsService.syncOmsLeads();
  }
}
