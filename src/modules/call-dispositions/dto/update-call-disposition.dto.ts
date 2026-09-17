import { PartialType } from '@nestjs/swagger';
import { CreateCallDispositionDto } from './create-call-disposition.dto';

export class UpdateCallDispositionDto extends PartialType(CreateCallDispositionDto) {}
