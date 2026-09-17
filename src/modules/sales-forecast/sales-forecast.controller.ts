import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalesForecastService } from './sales-forecast.service';
import { CreateSalesForecastDto } from './dto/create-sales-forecast.dto';
import { UpdateSalesForecastDto } from './dto/update-sales-forecast.dto';

@Controller('sales-forecast')
export class SalesForecastController {
  constructor(private readonly salesForecastService: SalesForecastService) {}

  @Post()
  create(@Body() createSalesForecastDto: CreateSalesForecastDto) {
    return this.salesForecastService.create(createSalesForecastDto);
  }

  @Get()
  findAll() {
    return this.salesForecastService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesForecastService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalesForecastDto: UpdateSalesForecastDto) {
    return this.salesForecastService.update(+id, updateSalesForecastDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesForecastService.remove(+id);
  }
}
