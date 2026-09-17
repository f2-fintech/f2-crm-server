import { Injectable } from '@nestjs/common';
import { CreateCibilDto } from './dto/create-cibil.dto';
import { UpdateCibilDto } from './dto/update-cibil.dto';

@Injectable()
export class CibilService {
  create(createCibilDto: CreateCibilDto) {
    return 'This action adds a new cibil';
  }

  findAll() {
    return `This action returns all cibil`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cibil`;
  }

  update(id: number, updateCibilDto: UpdateCibilDto) {
    return `This action updates a #${id} cibil`;
  }

  remove(id: number) {
    return `This action removes a #${id} cibil`;
  }
}
