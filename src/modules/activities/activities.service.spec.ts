import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service';
import { getModelToken } from '@nestjs/mongoose';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: getModelToken('Activity'), useValue: {} }
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});