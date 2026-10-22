import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriveAllocationController } from './drive-allocation.controller';
import { DriveAllocationService } from './drive-allocation.service';
import {
  DriveRecord,
  DriveRecordSchema,
} from './schemas/drive-record.schema';
import {
  DriveSource,
  DriveSourceSchema,
} from './schemas/drive-source.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import {
  NotionPage,
  NotionPageSchema,
} from '../notion-pages/schemas/notion-page.schema';
import {
  DriveAllocationLog,
  DriveAllocationLogSchema,
} from './schemas/drive-allocation-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DriveRecord.name, schema: DriveRecordSchema },
      { name: DriveSource.name, schema: DriveSourceSchema },
      { name: DriveAllocationLog.name, schema: DriveAllocationLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: NotionPage.name, schema: NotionPageSchema },
    ]),
  ],
  controllers: [DriveAllocationController],
  providers: [DriveAllocationService],
  exports: [DriveAllocationService],
})
export class DriveAllocationModule {}
