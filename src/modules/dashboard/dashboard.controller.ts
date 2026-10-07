import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboardData(@Req() req: any) {
    return await this.dashboardService.getDashboardData(req.user);
  }

  @Get('pipeline')
  async getPipelineData(@Req() req: any) {
    return await this.dashboardService.getPipelineData(req.user);
  }

  @Get('movement')
  async getMovementData(@Req() req: any) {
    const timeframe = req.query.timeframe || 'today';
    return await this.dashboardService.getMovementData(timeframe);
  }

  @Get('stage-aging')
  async getStageAging() {
    return await this.dashboardService.getStageAging();
  }

  @Get('agent-workload')
  async getAgentWorkload() {
    return await this.dashboardService.getAgentWorkload();
  }

  @Get('agent-activity')
  async getAgentActivity(@Query('timeframe') timeframe: string) {
    return await this.dashboardService.getAgentActivity(timeframe);
  }

  @Get('sla')
  async getSlaOverview() {
    return await this.dashboardService.getSlaOverview();
  }
}
