import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpsService } from './follow-ups.service';
import { getModelToken } from '@nestjs/mongoose';

describe('FollowUpsService', () => {
  let service: FollowUpsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpsService,
        { provide: getModelToken('FollowUp'), useValue: {} }
      ],
    }).compile();

    service = module.get<FollowUpsService>(FollowUpsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});