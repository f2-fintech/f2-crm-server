import { Injectable } from '@nestjs/common';
import { CreateEligibilityDto } from './dto/create-eligibility.dto';
import { UpdateEligibilityDto } from './dto/update-eligibility.dto';

@Injectable()
export class EligibilityService {
  create(createEligibilityDto: CreateEligibilityDto) {
    return 'This action adds a new eligibility';
  }

  findAll() {
    return `This action returns all eligibility`;
  }

  findOne(id: number) {
    return `This action returns a #${id} eligibility`;
  }

  update(id: number, updateEligibilityDto: UpdateEligibilityDto) {
    return `This action updates a #${id} eligibility`;
  }

  remove(id: number) {
    return `This action removes a #${id} eligibility`;
  }
}
