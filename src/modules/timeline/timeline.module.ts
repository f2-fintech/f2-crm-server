import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';

import {
  Timeline,
  TimelineSchema,
} from './schemas/timeline.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Timeline.name,
        schema: TimelineSchema,
      },
    ]),
  ],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}