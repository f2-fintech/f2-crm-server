import { Injectable } from '@nestjs/common';
import { CreateDialerDto } from './dto/create-dialer.dto';
import { UpdateDialerDto } from './dto/update-dialer.dto';

@Injectable()
export class DialerService {
  create(createDialerDto: CreateDialerDto) {
    return 'This action adds a new dialer';
  }

  findAll() {
    return `This action returns all dialer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dialer`;
  }

  update(id: number, updateDialerDto: UpdateDialerDto) {
    return `This action updates a #${id} dialer`;
  }

  remove(id: number) {
    return `This action removes a #${id} dialer`;
  }
}
