import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { Timeline, TimelineSchema } from '../timeline/schemas/timeline.schemas';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { LifecycleEventsModule } from '../lifecycle-events/lifecycle-events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Timeline.name, schema: TimelineSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    LifecycleEventsModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
