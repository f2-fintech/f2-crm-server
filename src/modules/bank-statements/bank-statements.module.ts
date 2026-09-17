import { Module } from '@nestjs/common';
import { BankStatementsService } from './bank-statements.service';
import { BankStatementsController } from './bank-statements.controller';

@Module({
  controllers: [BankStatementsController],
  providers: [BankStatementsService],
})
export class BankStatementsModule {}
