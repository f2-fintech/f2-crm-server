import { Controller, Get, Post, Body, Query } from '@nestjs/common';
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
