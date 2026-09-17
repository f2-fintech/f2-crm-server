import { PartialType } from '@nestjs/swagger';
import { CreateCibilDto } from './create-cibil.dto';

export class UpdateCibilDto extends PartialType(CreateCibilDto) {}
