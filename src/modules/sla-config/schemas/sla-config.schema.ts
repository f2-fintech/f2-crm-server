import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SlaConfigDocument = SlaConfig & Document;

@Schema({ timestamps: true })
export class SlaConfig {
  @Prop({ required: true })
  entityType: string; // 'Lead', 'Application', 'Customer'

  @Prop({ required: true })
  stage: string;

  @Prop({ required: true })
  durationDays: number;

  @Prop({ default: true })
  isEnabled: boolean;
}

export const SlaConfigSchema = SchemaFactory.createForClass(SlaConfig);
// Ensure uniqueness per entityType + stage
SlaConfigSchema.index({ entityType: 1, stage: 1 }, { unique: true });
