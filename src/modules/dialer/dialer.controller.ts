import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DialerService } from './dialer.service';
import { GetCallLogsDto } from './dto/get-call-logs.dto';

@ApiTags('Dialer')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dialer')
export class DialerController {
  constructor(private readonly dialerService: DialerService) {}

  @Get('call-logs')
  @ApiOperation({ summary: 'Get call log data from dialer API' })
  async getCallLogs(@Query() query: GetCallLogsDto, @Req() req: any) {
    return await this.dialerService.getCallLogs(query, req?.user);
  }

  @Post('call-logs')
  @ApiOperation({ summary: 'Query call log data with custom filter body' })
  async postCallLogs(@Body() body: GetCallLogsDto, @Req() req: any) {
    return await this.dialerService.getCallLogs(body, req?.user);
  }
}
