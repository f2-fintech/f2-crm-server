import { Injectable } from '@nestjs/common';
import { CreateLenderDto } from './dto/create-lender.dto';
import { UpdateLenderDto } from './dto/update-lender.dto';

@Injectable()
export class LendersService {
  create(createLenderDto: CreateLenderDto) {
    return 'This action adds a new lender';
  }

  findAll() {
    return `This action returns all lenders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} lender`;
  }

  update(id: number, updateLenderDto: UpdateLenderDto) {
    return `This action updates a #${id} lender`;
  }

  remove(id: number) {
    return `This action removes a #${id} lender`;
  }
}
