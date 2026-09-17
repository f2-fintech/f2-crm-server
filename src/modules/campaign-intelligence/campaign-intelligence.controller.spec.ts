import { Test, TestingModule } from '@nestjs/testing';
import { CampaignIntelligenceController } from './campaign-intelligence.controller';
import { CampaignIntelligenceService } from './campaign-intelligence.service';

describe('CampaignIntelligenceController', () => {
  let controller: CampaignIntelligenceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignIntelligenceController],
      providers: [CampaignIntelligenceService],
    }).compile();

    controller = module.get<CampaignIntelligenceController>(CampaignIntelligenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
