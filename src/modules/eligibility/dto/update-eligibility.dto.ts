import { PartialType } from '@nestjs/swagger';
import { CreateEligibilityDto } from './create-eligibility.dto';

export class UpdateEligibilityDto extends PartialType(CreateEligibilityDto) {}
