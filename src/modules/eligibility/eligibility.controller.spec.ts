import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';

describe('EligibilityController', () => {
  let controller: EligibilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EligibilityController],
      providers: [EligibilityService],
    }).compile();

    controller = module.get<EligibilityController>(EligibilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
