import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

export type TimelineDocument =
  HydratedDocument<Timeline>;

export enum TimelineType {
  LEAD = 'LEAD',
  CUSTOMER = 'CUSTOMER',
  APPLICATION = 'APPLICATION',
}

export enum TimelineAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  ACTIVITY = 'ACTIVITY',
  FOLLOWUP = 'FOLLOWUP',
  NOTE = 'NOTE',
  TASK = 'TASK',
  PIPELINE_CHANGED = 'PIPELINE_CHANGED',
  STAGE_CHANGED = 'STAGE_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ASSIGNED = 'ASSIGNED',
  COMMENT = 'COMMENT',
}

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Timeline {
  @Prop({
    unique: true,
  })
  timelineId: string;

  @Prop({
    enum: TimelineType,
    required: true,
  })
  entityType: TimelineType;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  entityId: Types.ObjectId;

  @Prop({
    enum: TimelineAction,
    required: true,
  })
  action: TimelineAction;

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
    type: MongooseSchema.Types.Mixed,
  })
  metadata?: Record<string, any>;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  performedBy?: Types.ObjectId;

  @Prop({
    default: false,
  })
  isDeleted: boolean;
}

export const TimelineSchema =
  SchemaFactory.createForClass(Timeline);