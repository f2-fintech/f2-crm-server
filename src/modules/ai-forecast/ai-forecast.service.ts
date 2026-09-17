import { Injectable } from '@nestjs/common';
import { CreateAiForecastDto } from './dto/create-ai-forecast.dto';
import { UpdateAiForecastDto } from './dto/update-ai-forecast.dto';

@Injectable()
export class AiForecastService {
  create(createAiForecastDto: CreateAiForecastDto) {
    return 'This action adds a new aiForecast';
  }

  findAll() {
    return `This action returns all aiForecast`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiForecast`;
  }

  update(id: number, updateAiForecastDto: UpdateAiForecastDto) {
    return `This action updates a #${id} aiForecast`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiForecast`;
  }
}
