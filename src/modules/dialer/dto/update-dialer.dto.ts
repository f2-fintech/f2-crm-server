import { PartialType } from '@nestjs/swagger';
import { CreateDialerDto } from './create-dialer.dto';

export class UpdateDialerDto extends PartialType(CreateDialerDto) {}
