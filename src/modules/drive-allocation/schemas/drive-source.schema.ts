import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DriveSourceDocument = HydratedDocument<DriveSource>;

export class DiscoveredDriveFile {
  @Prop({ required: true })
  fileId: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ default: '' })
  folderPath: string;

  @Prop({ default: '' })
  exportUrl: string;

  @Prop({ default: 0 })
  totalRecords: number;

  @Prop({ default: 0 })
  availableRecords: number;

  @Prop({ default: 0 })
  allocatedRecords: number;

  @Prop({ default: null })
  lastSyncedAt?: Date;
}

@Schema({ timestamps: true, collection: 'drive_sources', versionKey: false })
export class DriveSource {
  @Prop({ required: true, trim: true })
  folderUrl: string;

  @Prop({ required: true, trim: true, index: true })
  folderId: string;

  @Prop({ default: 'mis_search_automation' })
  title: string;

  @Prop({ type: [DiscoveredDriveFile], default: [] })
  files: DiscoveredDriveFile[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastScannedAt?: Date;
}

export const DriveSourceSchema = SchemaFactory.createForClass(DriveSource);
