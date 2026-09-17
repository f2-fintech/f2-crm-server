import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';
import { CreateAiScoringDto } from './dto/create-ai-scoring.dto';
import { UpdateAiScoringDto } from './dto/update-ai-scoring.dto';

@Controller('ai-scoring')
export class AiScoringController {
  constructor(private readonly aiScoringService: AiScoringService) {}

  @Post()
  create(@Body() createAiScoringDto: CreateAiScoringDto) {
    return this.aiScoringService.create(createAiScoringDto);
  }

  @Get()
  findAll() {
    return this.aiScoringService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiScoringService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiScoringDto: UpdateAiScoringDto) {
    return this.aiScoringService.update(+id, updateAiScoringDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiScoringService.remove(+id);
  }
}
