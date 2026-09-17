import { Injectable } from '@nestjs/common';
import { CreateLeadSourceDto } from './dto/create-lead-source.dto';
import { UpdateLeadSourceDto } from './dto/update-lead-source.dto';

@Injectable()
export class LeadSourcesService {
  create(createLeadSourceDto: CreateLeadSourceDto) {
    return 'This action adds a new leadSource';
  }

  findAll() {
    return `This action returns all leadSources`;
  }

  findOne(id: number) {
    return `This action returns a #${id} leadSource`;
  }

  update(id: number, updateLeadSourceDto: UpdateLeadSourceDto) {
    return `This action updates a #${id} leadSource`;
  }

  remove(id: number) {
    return `This action removes a #${id} leadSource`;
  }
}
