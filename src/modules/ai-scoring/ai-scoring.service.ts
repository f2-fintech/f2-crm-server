import { Injectable } from '@nestjs/common';
import { CreateAiScoringDto } from './dto/create-ai-scoring.dto';
import { UpdateAiScoringDto } from './dto/update-ai-scoring.dto';

@Injectable()
export class AiScoringService {
  create(createAiScoringDto: CreateAiScoringDto) {
    return 'This action adds a new aiScoring';
  }

  findAll() {
    return `This action returns all aiScoring`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiScoring`;
  }

  update(id: number, updateAiScoringDto: UpdateAiScoringDto) {
    return `This action updates a #${id} aiScoring`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiScoring`;
  }
}
