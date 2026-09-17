import { Test, TestingModule } from '@nestjs/testing';
import { LeadSourcesController } from './lead-sources.controller';
import { LeadSourcesService } from './lead-sources.service';

describe('LeadSourcesController', () => {
  let controller: LeadSourcesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadSourcesController],
      providers: [LeadSourcesService],
    }).compile();

    controller = module.get<LeadSourcesController>(LeadSourcesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
