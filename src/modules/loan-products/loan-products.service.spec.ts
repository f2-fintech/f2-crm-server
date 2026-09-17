import { Test, TestingModule } from '@nestjs/testing';
import { LoanProductsService } from './loan-products.service';

describe('LoanProductsService', () => {
  let service: LoanProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoanProductsService],
    }).compile();

    service = module.get<LoanProductsService>(LoanProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
