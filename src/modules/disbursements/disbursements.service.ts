import { Injectable } from '@nestjs/common';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { UpdateDisbursementDto } from './dto/update-disbursement.dto';

@Injectable()
export class DisbursementsService {
  create(createDisbursementDto: CreateDisbursementDto) {
    return 'This action adds a new disbursement';
  }

  findAll() {
    return `This action returns all disbursements`;
  }

  findOne(id: number) {
    return `This action returns a #${id} disbursement`;
  }

  update(id: number, updateDisbursementDto: UpdateDisbursementDto) {
    return `This action updates a #${id} disbursement`;
  }

  remove(id: number) {
    return `This action removes a #${id} disbursement`;
  }
}
