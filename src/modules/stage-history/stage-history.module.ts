import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StageHistoryService } from './stage-history.service';
import { StageHistoryController } from './stage-history.controller';
import {
  StageHistory,
  StageHistorySchema,
} from './schemas/stage-history.schema';
import { LifecycleEventsModule } from '../lifecycle-events/lifecycle-events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StageHistory.name, schema: StageHistorySchema },
    ]),
    forwardRef(() => LifecycleEventsModule),
  ],
  providers: [StageHistoryService],
  controllers: [StageHistoryController],
  exports: [StageHistoryService, MongooseModule],
})
export class StageHistoryModule {}
