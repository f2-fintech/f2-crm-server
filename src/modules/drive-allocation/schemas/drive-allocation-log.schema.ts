import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DriveAllocationLogDocument = HydratedDocument<DriveAllocationLog>;

export enum AllocationActionType {
  ALLOCATED = 'ALLOCATED',
  REASSIGNED = 'REASSIGNED',
  RETURNED = 'RETURNED',
}

@Schema({ timestamps: true, collection: 'drive_allocation_logs' })
export class DriveAllocationLog {
  @Prop({
    type: String,
    enum: AllocationActionType,
    required: true,
    index: true,
  })
  action: AllocationActionType;

  @Prop({ required: true, index: true })
  sourceFileId: string;

  @Prop({ required: true })
  sourceFileName: string;

  @Prop({ default: '' })
  folderPath: string;

  @Prop({ default: 0 })
  count: number;

  // For ALLOCATED or destination in REASSIGNED
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  toEmployeeId?: Types.ObjectId;

  @Prop({ default: '' })
  toEmployeeName?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  toManagerId?: Types.ObjectId;

  @Prop({ default: '' })
  toManagerName?: string;

  // For RETURNED or origin in REASSIGNED
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, index: true })
  fromEmployeeId?: Types.ObjectId;

  @Prop({ default: '' })
  fromEmployeeName?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  fromManagerId?: Types.ObjectId;

  @Prop({ default: '' })
  fromManagerName?: string;

  @Prop({ default: '' })
  targetSheetTitle?: string;

  @Prop({ default: '' })
  performedBy?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  performedById?: Types.ObjectId;

  @Prop({ default: '' })
  remarks?: string;

  // Breakdown of dispositions when action happened (e.g. { Interested: 5, "Follow up": 2 })
  @Prop({ type: Object, default: {} })
  dispositionSummary?: Record<string, number>;

  // Snapshot of leads involved in this batch action including user calling remarks
  @Prop({ type: [Object], default: [] })
  recordsSummary: Array<{
    rowIndex?: number;
    customerName?: string;
    phone?: string;
    branch?: string;
    state?: string;
    eligibilityAmount?: number;
    disposition?: string;
    remarks?: string;
  }>;
}

export const DriveAllocationLogSchema = SchemaFactory.createForClass(DriveAllocationLog);
DriveAllocationLogSchema.index({ createdAt: -1 });
DriveAllocationLogSchema.index({ sourceFileId: 1, action: 1 });
