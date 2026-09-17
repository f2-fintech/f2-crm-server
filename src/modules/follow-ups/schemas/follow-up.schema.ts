import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FollowUpDocument = HydratedDocument<FollowUp>;

export enum FollowUpMode {
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  MEETING = 'MEETING',
}

export enum FollowUpStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
}

export enum FollowUpPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class FollowUp {
  @Prop({ unique: true })
  followUpId: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Lead',
    required: true,
  })
  leadId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Customer',
  })
  customerId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Application',
  })
  applicationId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  assignedTo: Types.ObjectId;

  @Prop({ required: true })
  followUpDate: Date;

  @Prop()
  followUpTime: string;

  @Prop({
    enum: FollowUpMode,
    default: FollowUpMode.CALL,
  })
  mode: FollowUpMode;

  @Prop({
    enum: FollowUpStatus,
    default: FollowUpStatus.PENDING,
  })
  status: FollowUpStatus;

  @Prop({
    enum: FollowUpPriority,
    default: FollowUpPriority.MEDIUM,
  })
  priority: FollowUpPriority;

  @Prop()
  remarks: string;

  @Prop()
  nextFollowUpDate?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: Types.ObjectId;

  @Prop({
    default: false,
  })
  isDeleted: boolean;
}

export const FollowUpSchema =
  SchemaFactory.createForClass(FollowUp);
