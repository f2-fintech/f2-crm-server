import { PartialType } from '@nestjs/swagger';
import { CreateLenderDto } from './create-lender.dto';

export class UpdateLenderDto extends PartialType(CreateLenderDto) {}
