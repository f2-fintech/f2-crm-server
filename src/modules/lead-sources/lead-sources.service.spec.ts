import { Test, TestingModule } from '@nestjs/testing';
import { LeadSourcesService } from './lead-sources.service';

describe('LeadSourcesService', () => {
  let service: LeadSourcesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadSourcesService],
    }).compile();

    service = module.get<LeadSourcesService>(LeadSourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
