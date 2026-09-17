import { Injectable } from '@nestjs/common';
import { CreateAiAgentDto } from './dto/create-ai-agent.dto';
import { UpdateAiAgentDto } from './dto/update-ai-agent.dto';

@Injectable()
export class AiAgentsService {
  create(createAiAgentDto: CreateAiAgentDto) {
    return 'This action adds a new aiAgent';
  }

  findAll() {
    return `This action returns all aiAgents`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiAgent`;
  }

  update(id: number, updateAiAgentDto: UpdateAiAgentDto) {
    return `This action updates a #${id} aiAgent`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiAgent`;
  }
}
