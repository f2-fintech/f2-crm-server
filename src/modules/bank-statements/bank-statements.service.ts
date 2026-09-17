import { Injectable } from '@nestjs/common';
import { CreateBankStatementDto } from './dto/create-bank-statement.dto';
import { UpdateBankStatementDto } from './dto/update-bank-statement.dto';

@Injectable()
export class BankStatementsService {
  create(createBankStatementDto: CreateBankStatementDto) {
    return 'This action adds a new bankStatement';
  }

  findAll() {
    return `This action returns all bankStatements`;
  }

  findOne(id: number) {
    return `This action returns a #${id} bankStatement`;
  }

  update(id: number, updateBankStatementDto: UpdateBankStatementDto) {
    return `This action updates a #${id} bankStatement`;
  }

  remove(id: number) {
    return `This action removes a #${id} bankStatement`;
  }
}
