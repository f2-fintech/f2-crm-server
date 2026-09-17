import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DialerService } from './dialer.service';
import { CreateDialerDto } from './dto/create-dialer.dto';
import { UpdateDialerDto } from './dto/update-dialer.dto';

@Controller('dialer')
export class DialerController {
  constructor(private readonly dialerService: DialerService) {}

  @Post()
  create(@Body() createDialerDto: CreateDialerDto) {
    return this.dialerService.create(createDialerDto);
  }

  @Get()
  findAll() {
    return this.dialerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dialerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDialerDto: UpdateDialerDto) {
    return this.dialerService.update(+id, updateDialerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dialerService.remove(+id);
  }
}
