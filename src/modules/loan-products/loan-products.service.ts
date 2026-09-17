import { Injectable } from '@nestjs/common';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@Injectable()
export class LoanProductsService {
  create(createLoanProductDto: CreateLoanProductDto) {
    return 'This action adds a new loanProduct';
  }

  findAll() {
    return `This action returns all loanProducts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} loanProduct`;
  }

  update(id: number, updateLoanProductDto: UpdateLoanProductDto) {
    return `This action updates a #${id} loanProduct`;
  }

  remove(id: number) {
    return `This action removes a #${id} loanProduct`;
  }
}
