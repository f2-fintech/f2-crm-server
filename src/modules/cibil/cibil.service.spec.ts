import { Test, TestingModule } from '@nestjs/testing';
import { CibilService } from './cibil.service';

describe('CibilService', () => {
  let service: CibilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CibilService],
    }).compile();

    service = module.get<CibilService>(CibilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
