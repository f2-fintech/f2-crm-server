import { Injectable } from '@nestjs/common';
import { CreateAiSummaryDto } from './dto/create-ai-summary.dto';
import { UpdateAiSummaryDto } from './dto/update-ai-summary.dto';

@Injectable()
export class AiSummaryService {
  create(createAiSummaryDto: CreateAiSummaryDto) {
    return 'This action adds a new aiSummary';
  }

  findAll() {
    return `This action returns all aiSummary`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiSummary`;
  }

  update(id: number, updateAiSummaryDto: UpdateAiSummaryDto) {
    return `This action updates a #${id} aiSummary`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiSummary`;
  }
}
