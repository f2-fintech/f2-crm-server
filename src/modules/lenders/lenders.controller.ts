import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LendersService } from './lenders.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';

@Controller('lenders')
export class LendersController {
  constructor(private readonly lendersService: LendersService) {}

  @Post()
  create(@Body() createLenderDto: CreateLenderDto) {
    return this.lendersService.create(createLenderDto);
  }

  @Get()
  findAll() {
    return this.lendersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lendersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLenderDto: UpdateLenderDto) {
    return this.lendersService.update(+id, updateLenderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lendersService.remove(+id);
  }
}
