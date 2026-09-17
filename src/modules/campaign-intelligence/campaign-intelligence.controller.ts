import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CampaignIntelligenceService } from './campaign-intelligence.service';
import { CreateCampaignIntelligenceDto } from './dto/create-campaign-intelligence.dto';
import { UpdateCampaignIntelligenceDto } from './dto/update-campaign-intelligence.dto';

@Controller('campaign-intelligence')
export class CampaignIntelligenceController {
  constructor(private readonly campaignIntelligenceService: CampaignIntelligenceService) {}

  @Post()
  create(@Body() createCampaignIntelligenceDto: CreateCampaignIntelligenceDto) {
    return this.campaignIntelligenceService.create(createCampaignIntelligenceDto);
  }

  @Get()
  findAll() {
    return this.campaignIntelligenceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignIntelligenceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCampaignIntelligenceDto: UpdateCampaignIntelligenceDto) {
    return this.campaignIntelligenceService.update(+id, updateCampaignIntelligenceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.campaignIntelligenceService.remove(+id);
  }
}
