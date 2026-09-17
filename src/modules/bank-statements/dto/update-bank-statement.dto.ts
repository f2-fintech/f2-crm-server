import { PartialType } from '@nestjs/swagger';
import { CreateBankStatementDto } from './create-bank-statement.dto';

export class UpdateBankStatementDto extends PartialType(CreateBankStatementDto) {}
