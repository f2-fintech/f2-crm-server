import { Test, TestingModule } from '@nestjs/testing';
import { LendersService } from './lenders.service';

describe('LendersService', () => {
  let service: LendersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LendersService],
    }).compile();

    service = module.get<LendersService>(LendersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
