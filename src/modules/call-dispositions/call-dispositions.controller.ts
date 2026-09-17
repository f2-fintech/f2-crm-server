import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CallDispositionsService } from './call-dispositions.service';
import { CreateCallDispositionDto } from './dto/create-call-disposition.dto';
import { UpdateCallDispositionDto } from './dto/update-call-disposition.dto';

@Controller('call-dispositions')
export class CallDispositionsController {
  constructor(private readonly callDispositionsService: CallDispositionsService) {}

  @Post()
  create(@Body() createCallDispositionDto: CreateCallDispositionDto) {
    return this.callDispositionsService.create(createCallDispositionDto);
  }

  @Get()
  findAll() {
    return this.callDispositionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callDispositionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCallDispositionDto: UpdateCallDispositionDto) {
    return this.callDispositionsService.update(+id, updateCallDispositionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.callDispositionsService.remove(+id);
  }
}
