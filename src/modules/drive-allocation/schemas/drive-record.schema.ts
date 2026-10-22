import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DriveRecordDocument = HydratedDocument<DriveRecord>;

export enum RecordAllocationStatus {
  AVAILABLE = 'AVAILABLE',
  ALLOCATED = 'ALLOCATED',
}

export class AllocatedLeadItem {
  id: string;
  rowIndex: number;
  phone: string;
  cleanPhone: string;
  customerName: string;
  branch: string;
  state: string;
  eligibilityAmount: number;
  rawData: Record<string, any>;
}

@Schema({ timestamps: true, collection: 'drive_records' })
export class DriveRecord {
  @Prop({ required: true, index: true })
  sourceFileId: string;

  @Prop({ required: true })
  sourceFileName: string;

  @Prop({ default: '' })
  folderPath: string;

  @Prop({
    type: String,
    enum: RecordAllocationStatus,
    default: RecordAllocationStatus.ALLOCATED,
    index: true,
  })
  status: RecordAllocationStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  assignedManagerId?: Types.ObjectId;

  @Prop({ default: '' })
  assignedManagerName?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  })
  assignedEmployeeId?: Types.ObjectId;

  @Prop({ default: '' })
  assignedEmployeeName?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'NotionPage',
    default: null,
    index: true,
  })
  notionPageId?: Types.ObjectId;

  @Prop({ default: '' })
  notionPageTitle?: string;

  @Prop({ default: 0 })
  allocatedCount: number;

  @Prop({ default: null })
  allocatedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  allocatedBy?: Types.ObjectId;

  @Prop({ default: '' })
  remarks?: string;

  // The array of records allocated to this employee in this allocation
  @Prop({ type: [Object], default: [] })
  records: Array<{
    id: string;
    rowIndex: number;
    phone: string;
    cleanPhone: string;
    customerName: string;
    branch: string;
    state: string;
    eligibilityAmount: number;
    rawData: Record<string, any>;
  }>;

  @Prop({ type: [Object], default: [] })
  history: Array<{
    action: 'ALLOCATED' | 'REASSIGNED' | 'RETURNED';
    managerId?: string;
    managerName?: string;
    employeeId?: string;
    employeeName?: string;
    performedBy?: string;
    timestamp: Date;
    notes?: string;
  }>;
}

export const DriveRecordSchema = SchemaFactory.createForClass(DriveRecord);
DriveRecordSchema.index({ sourceFileId: 1, status: 1 });
DriveRecordSchema.index({ assignedEmployeeId: 1 });
