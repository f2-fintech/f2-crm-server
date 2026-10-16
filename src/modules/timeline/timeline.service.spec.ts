import { Test, TestingModule } from '@nestjs/testing';
import { TimelineService } from './timeline.service';
import { getModelToken } from '@nestjs/mongoose';

describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineService,
        { provide: getModelToken('Timeline'), useValue: {} }
      ],
    }).compile();

    service = module.get<TimelineService>(TimelineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});