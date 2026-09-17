import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BankStatementsService } from './bank-statements.service';
import { CreateBankStatementDto } from './dto/create-bank-statement.dto';
import { UpdateBankStatementDto } from './dto/update-bank-statement.dto';

@Controller('bank-statements')
export class BankStatementsController {
  constructor(private readonly bankStatementsService: BankStatementsService) {}

  @Post()
  create(@Body() createBankStatementDto: CreateBankStatementDto) {
    return this.bankStatementsService.create(createBankStatementDto);
  }

  @Get()
  findAll() {
    return this.bankStatementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bankStatementsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBankStatementDto: UpdateBankStatementDto) {
    return this.bankStatementsService.update(+id, updateBankStatementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bankStatementsService.remove(+id);
  }
}
