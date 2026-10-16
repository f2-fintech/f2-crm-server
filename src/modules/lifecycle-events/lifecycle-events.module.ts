import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LifecycleEventsService } from './lifecycle-events.service';
import { LifecycleEventsController } from './lifecycle-events.controller';
import {
  LifecycleEvent,
  LifecycleEventSchema,
} from './schemas/lifecycle-event.schema';
import { StageHistoryModule } from '../stage-history/stage-history.module';
import { SlaConfigModule } from '../sla-config/sla-config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LifecycleEvent.name, schema: LifecycleEventSchema },
    ]),
    forwardRef(() => StageHistoryModule),
    SlaConfigModule,
  ],
  providers: [LifecycleEventsService],
  controllers: [LifecycleEventsController],
  exports: [LifecycleEventsService, MongooseModule],
})
export class LifecycleEventsModule {}
