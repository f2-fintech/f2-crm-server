import { Injectable } from '@nestjs/common';
import { CreateCampaignIntelligenceDto } from './dto/create-campaign-intelligence.dto';
import { UpdateCampaignIntelligenceDto } from './dto/update-campaign-intelligence.dto';

@Injectable()
export class CampaignIntelligenceService {
  create(createCampaignIntelligenceDto: CreateCampaignIntelligenceDto) {
    return 'This action adds a new campaignIntelligence';
  }

  findAll() {
    return `This action returns all campaignIntelligence`;
  }

  findOne(id: number) {
    return `This action returns a #${id} campaignIntelligence`;
  }

  update(id: number, updateCampaignIntelligenceDto: UpdateCampaignIntelligenceDto) {
    return `This action updates a #${id} campaignIntelligence`;
  }

  remove(id: number) {
    return `This action removes a #${id} campaignIntelligence`;
  }
}
