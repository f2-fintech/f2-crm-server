import { Test, TestingModule } from '@nestjs/testing';
import { CampaignIntelligenceService } from './campaign-intelligence.service';

describe('CampaignIntelligenceService', () => {
  let service: CampaignIntelligenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignIntelligenceService],
    }).compile();

    service = module.get<CampaignIntelligenceService>(CampaignIntelligenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
