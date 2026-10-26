import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DialerService } from './dialer.service';
import { GetCallLogsDto } from './dto/get-call-logs.dto';

@ApiTags('Dialer')
@Controller('dialer')
export class DialerController {
  constructor(private readonly dialerService: DialerService) {}

  @Get('call-logs')
  @ApiOperation({ summary: 'Get call log data from dialer API' })
  async getCallLogs(@Query() query: GetCallLogsDto) {
    return await this.dialerService.getCallLogs(query);
  }

  @Post('call-logs')
  @ApiOperation({ summary: 'Query call log data with custom filter body' })
  async postCallLogs(@Body() body: GetCallLogsDto) {
    return await this.dialerService.getCallLogs(body);
  }
}
