import { Controller, Get, Post, Body, Query, Patch, Param } from '@nestjs/common';
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

  @Patch(':id/documents')
  addDocument(@Param('id') id: string, @Body() body: { type: string, url: string }) {
    return this.leadsService.addDocument(id, body);
  }

  @Post(':id/convert')
  convertToCustomer(@Param('id') id: string) {
    return this.leadsService.convertToCustomer(id);
  }
  @Get('dashboard/stats')
  getDashboardStats() {
    return {
      success: true,
      data: {
        overview: {
          totalLeads: 0,
          approvedLeads: 0,
          rejectedLeads: 0,
          followUpLeads: 0,
        },
        performance: {
          todayLeads: 0,
          conversionRate: 0,
        }
      }
    };
  }
}
