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
  syncOmsLeads(@Body() body: { startDate?: string; endDate?: string }) {
    return this.leadsService.syncOmsLeads(body?.startDate, body?.endDate);
  }

  @Get('oms/history/:ticketId')
  async getOmsHistory(@Param('ticketId') ticketId: string) {
    try {
      const response = await fetch(`https://admin.f2fintech.in/api/v1/get-ticket-histories/${ticketId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('oms/detail/:ticketId')
  async getOmsDetail(@Param('ticketId') ticketId: string) {
    try {
      const response = await fetch(`https://admin.f2fintech.in/api/v1/get-ticket-with-detail/${ticketId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
