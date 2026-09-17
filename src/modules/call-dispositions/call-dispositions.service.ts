import { Injectable } from '@nestjs/common';
import { CreateCallDispositionDto } from './dto/create-call-disposition.dto';
import { UpdateCallDispositionDto } from './dto/update-call-disposition.dto';

@Injectable()
export class CallDispositionsService {
  create(createCallDispositionDto: CreateCallDispositionDto) {
    return 'This action adds a new callDisposition';
  }

  findAll() {
    return `This action returns all callDispositions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} callDisposition`;
  }

  update(id: number, updateCallDispositionDto: UpdateCallDispositionDto) {
    return `This action updates a #${id} callDisposition`;
  }

  remove(id: number) {
    return `This action removes a #${id} callDisposition`;
  }
}
