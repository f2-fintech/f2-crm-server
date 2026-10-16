import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleEventsService } from './lifecycle-events.service';
import { getModelToken } from '@nestjs/mongoose';
import { LifecycleEvent } from './schemas/lifecycle-event.schema';
import { StageHistoryService } from '../stage-history/stage-history.service';
import { SlaConfigService } from '../sla-config/sla-config.service';

describe('LifecycleEventsService', () => {
  let service: LifecycleEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleEventsService,
        { provide: getModelToken(LifecycleEvent.name), useValue: {} },
        { provide: StageHistoryService, useValue: {} },
        { provide: SlaConfigService, useValue: {} }
      ],
    }).compile();

    service = module.get<LifecycleEventsService>(LifecycleEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});