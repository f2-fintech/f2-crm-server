import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { LifecycleEventSource } from '../../lifecycle-events/enums/lifecycle.enum';

export type StageHistoryDocument = HydratedDocument<StageHistory>;

@Schema({ timestamps: true, collection: 'stage_histories' })
export class StageHistory {
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

  @Prop({ required: true })
  stage: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  ownerId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: true })
  enteredAt: Date;

  @Prop({ type: Date, default: null })
  exitedAt: Date;

  @Prop({ default: null })
  durationSeconds: number;

  @Prop({ default: null })
  slaSeconds: number;

  @Prop({ default: null })
  slaStatus: string;

  @Prop({ type: String, enum: LifecycleEventSource, required: true })
  source: LifecycleEventSource;
}

export const StageHistorySchema = SchemaFactory.createForClass(StageHistory);

StageHistorySchema.index({ entityType: 1, entityId: 1, enteredAt: -1 });
StageHistorySchema.index({ applicationId: 1, enteredAt: -1 });
StageHistorySchema.index({ customerId: 1, enteredAt: -1 });
StageHistorySchema.index({ leadId: 1, enteredAt: -1 });
StageHistorySchema.index({ stage: 1, enteredAt: -1 });
