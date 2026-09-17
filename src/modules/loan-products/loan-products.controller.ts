import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@Controller('loan-products')
export class LoanProductsController {
  constructor(private readonly loanProductsService: LoanProductsService) {}

  @Post()
  create(@Body() createLoanProductDto: CreateLoanProductDto) {
    return this.loanProductsService.create(createLoanProductDto);
  }

  @Get()
  findAll() {
    return this.loanProductsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loanProductsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoanProductDto: UpdateLoanProductDto) {
    return this.loanProductsService.update(+id, updateLoanProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loanProductsService.remove(+id);
  }
}
