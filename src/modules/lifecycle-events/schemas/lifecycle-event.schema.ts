import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  LifecycleEventType,
  LifecycleEventSource,
} from '../enums/lifecycle.enum';

export type LifecycleEventDocument = HydratedDocument<LifecycleEvent>;

@Schema({ timestamps: true, collection: 'lifecycle_events' })
export class LifecycleEvent {
  @Prop({ required: true, trim: true })
  entityType: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ default: null })
  leadId: string;

  @Prop({ default: null })
  customerId: string;

  @Prop({ default: null })
  applicationId: string;

  @Prop({ default: null })
  omsId: string;

  @Prop({ type: String, enum: LifecycleEventType, required: true })
  eventType: LifecycleEventType;

  @Prop({ default: null })
  fromStage: string;

  @Prop({ default: null })
  toStage: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  performedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: LifecycleEventSource, required: true })
  source: LifecycleEventSource;

  @Prop({ default: '' })
  remarks: string;

  @Prop({ default: '' })
  reason: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata: any;
}

export const LifecycleEventSchema =
  SchemaFactory.createForClass(LifecycleEvent);

LifecycleEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
LifecycleEventSchema.index({ applicationId: 1, createdAt: -1 });
LifecycleEventSchema.index({ customerId: 1, createdAt: -1 });
LifecycleEventSchema.index({ leadId: 1, createdAt: -1 });
LifecycleEventSchema.index({ omsId: 1, createdAt: -1 });
LifecycleEventSchema.index({ eventType: 1, createdAt: -1 });
