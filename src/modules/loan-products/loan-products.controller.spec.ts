import { Test, TestingModule } from '@nestjs/testing';
import { LoanProductsController } from './loan-products.controller';
import { LoanProductsService } from './loan-products.service';

describe('LoanProductsController', () => {
  let controller: LoanProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoanProductsController],
      providers: [LoanProductsService],
    }).compile();

    controller = module.get<LoanProductsController>(LoanProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
