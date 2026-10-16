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
  constructor(private readonly leadsService: LeadsService) { }

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
      const baseUrl = process.env.OMS_BASE_URL || 'https://admin.f2fintech.in';
      const companyId = process.env.OMS_COMPANY_ID || '101';
      let response = await fetch(`${baseUrl}/api/v1/get-ticket-histories/${ticketId}`, {
        headers: { companyid: companyId, Accept: 'application/json', 'User-Agent': 'F2CRM-Server/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      let data = await response.json();

      if ((!data?.data || data.statusCode === 404)) {
        const fallbackId = companyId === '101' ? '6' : '101';
        const altResponse = await fetch(`${baseUrl}/api/v1/get-ticket-histories/${ticketId}`, {
          headers: { companyid: fallbackId, Accept: 'application/json', 'User-Agent': 'F2CRM-Server/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        const altData = await altResponse.json();
        if (altData?.data && Array.isArray(altData.data)) {
          data = altData;
        }
      }

      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('oms/detail/:ticketId')
  async getOmsDetail(@Param('ticketId') ticketId: string) {
    try {
      const baseUrl = process.env.OMS_BASE_URL || 'https://admin.f2fintech.in';
      const companyId = process.env.OMS_COMPANY_ID || '101';
      let response = await fetch(`${baseUrl}/api/v1/get-ticket-with-detail/${ticketId}`, {
        headers: { companyid: companyId, Accept: 'application/json', 'User-Agent': 'F2CRM-Server/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      let data = await response.json();

      if ((!data?.data || data.statusCode === 404)) {
        const fallbackId = companyId === '101' ? '6' : '101';
        const alt = await fetch(`${baseUrl}/api/v1/get-ticket-with-detail/${ticketId}`, {
          headers: { companyid: fallbackId, Accept: 'application/json', 'User-Agent': 'F2CRM-Server/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        const altData = await alt.json();
        if (altData?.data) {
          data = altData;
        }
      }

      return data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
