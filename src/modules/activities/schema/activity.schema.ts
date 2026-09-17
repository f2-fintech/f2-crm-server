import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

export enum ActivityType {
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
  TASK = 'TASK',
}

export enum ActivityStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Activity {
  @Prop({ unique: true })
  activityId: string;

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

  @Prop({
    enum: ActivityType,
    required: true,
  })
  activityType: ActivityType;

  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    required: true,
  })
  activityDate: Date;

  @Prop()
  activityTime?: string;

  @Prop({
    enum: ActivityStatus,
    default: ActivityStatus.PENDING,
  })
  status: ActivityStatus;

  @Prop()
  location?: string;

  @Prop()
  meetingLink?: string;

  @Prop({
    type: [String],
    default: [],
  })
  attachments: string[];

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

export const ActivitySchema =
  SchemaFactory.createForClass(Activity);