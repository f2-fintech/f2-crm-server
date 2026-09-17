import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiFollowupsService } from './ai-followups.service';
import { CreateAiFollowupDto } from './dto/create-ai-followup.dto';
import { UpdateAiFollowupDto } from './dto/update-ai-followup.dto';

@Controller('ai-followups')
export class AiFollowupsController {
  constructor(private readonly aiFollowupsService: AiFollowupsService) {}

  @Post()
  create(@Body() createAiFollowupDto: CreateAiFollowupDto) {
    return this.aiFollowupsService.create(createAiFollowupDto);
  }

  @Get()
  findAll() {
    return this.aiFollowupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiFollowupsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiFollowupDto: UpdateAiFollowupDto) {
    return this.aiFollowupsService.update(+id, updateAiFollowupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiFollowupsService.remove(+id);
  }
}
