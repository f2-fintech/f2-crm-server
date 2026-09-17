import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CibilService } from './cibil.service';
import { CreateCibilDto } from './dto/create-cibil.dto';
import { UpdateCibilDto } from './dto/update-cibil.dto';

@Controller('cibil')
export class CibilController {
  constructor(private readonly cibilService: CibilService) {}

  @Post()
  create(@Body() createCibilDto: CreateCibilDto) {
    return this.cibilService.create(createCibilDto);
  }

  @Get()
  findAll() {
    return this.cibilService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cibilService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCibilDto: UpdateCibilDto) {
    return this.cibilService.update(+id, updateCibilDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cibilService.remove(+id);
  }
}
