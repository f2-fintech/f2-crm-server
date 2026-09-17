import { PartialType } from '@nestjs/swagger';
import { CreateCampaignIntelligenceDto } from './create-campaign-intelligence.dto';

export class UpdateCampaignIntelligenceDto extends PartialType(CreateCampaignIntelligenceDto) {}
