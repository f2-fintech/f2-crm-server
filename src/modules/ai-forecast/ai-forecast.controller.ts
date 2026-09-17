import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiForecastService } from './ai-forecast.service';
import { CreateAiForecastDto } from './dto/create-ai-forecast.dto';
import { UpdateAiForecastDto } from './dto/update-ai-forecast.dto';

@Controller('ai-forecast')
export class AiForecastController {
  constructor(private readonly aiForecastService: AiForecastService) {}

  @Post()
  create(@Body() createAiForecastDto: CreateAiForecastDto) {
    return this.aiForecastService.create(createAiForecastDto);
  }

  @Get()
  findAll() {
    return this.aiForecastService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiForecastService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiForecastDto: UpdateAiForecastDto) {
    return this.aiForecastService.update(+id, updateAiForecastDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiForecastService.remove(+id);
  }
}
