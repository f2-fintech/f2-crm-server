import { Injectable } from '@nestjs/common';
import { CreateAiFollowupDto } from './dto/create-ai-followup.dto';
import { UpdateAiFollowupDto } from './dto/update-ai-followup.dto';

@Injectable()
export class AiFollowupsService {
  create(createAiFollowupDto: CreateAiFollowupDto) {
    return 'This action adds a new aiFollowup';
  }

  findAll() {
    return `This action returns all aiFollowups`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiFollowup`;
  }

  update(id: number, updateAiFollowupDto: UpdateAiFollowupDto) {
    return `This action updates a #${id} aiFollowup`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiFollowup`;
  }
}
