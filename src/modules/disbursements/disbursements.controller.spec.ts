import { Test, TestingModule } from '@nestjs/testing';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementsService } from './disbursements.service';

describe('DisbursementsController', () => {
  let controller: DisbursementsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisbursementsController],
      providers: [DisbursementsService],
    }).compile();

    controller = module.get<DisbursementsController>(DisbursementsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
