import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { getModelToken } from '@nestjs/mongoose';
import { LifecycleEventsService } from '../lifecycle-events/lifecycle-events.service';

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: getModelToken('Lead'), useValue: {} },
        { provide: getModelToken('Timeline'), useValue: {} },
        { provide: getModelToken('Customer'), useValue: {} },
        { provide: LifecycleEventsService, useValue: {} }
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});