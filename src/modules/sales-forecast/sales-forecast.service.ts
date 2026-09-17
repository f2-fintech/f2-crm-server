import { Injectable } from '@nestjs/common';
import { CreateSalesForecastDto } from './dto/create-sales-forecast.dto';
import { UpdateSalesForecastDto } from './dto/update-sales-forecast.dto';

@Injectable()
export class SalesForecastService {
  create(createSalesForecastDto: CreateSalesForecastDto) {
    return 'This action adds a new salesForecast';
  }

  findAll() {
    return `This action returns all salesForecast`;
  }

  findOne(id: number) {
    return `This action returns a #${id} salesForecast`;
  }

  update(id: number, updateSalesForecastDto: UpdateSalesForecastDto) {
    return `This action updates a #${id} salesForecast`;
  }

  remove(id: number) {
    return `This action removes a #${id} salesForecast`;
  }
}
