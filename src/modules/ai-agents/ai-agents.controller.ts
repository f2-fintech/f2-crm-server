import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiAgentsService } from './ai-agents.service';
import { CreateAiAgentDto } from './dto/create-ai-agent.dto';
import { UpdateAiAgentDto } from './dto/update-ai-agent.dto';

@Controller('ai-agents')
export class AiAgentsController {
  constructor(private readonly aiAgentsService: AiAgentsService) {}

  @Post()
  create(@Body() createAiAgentDto: CreateAiAgentDto) {
    return this.aiAgentsService.create(createAiAgentDto);
  }

  @Get()
  findAll() {
    return this.aiAgentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiAgentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiAgentDto: UpdateAiAgentDto) {
    return this.aiAgentsService.update(+id, updateAiAgentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiAgentsService.remove(+id);
  }
}
