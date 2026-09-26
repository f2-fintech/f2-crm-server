import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type LeadDocument = HydratedDocument<Lead>;

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  LOST = 'LOST',
  CONVERTED = 'CONVERTED',
}

@Schema({
  timestamps: true,
  collection: 'leads',
})
export class Lead {
  @Prop({ unique: true, required: true, trim: true })
  leadId: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  loanType: string;

  @Prop({ default: 0 })
  loanAmount: number;

  @Prop({ type: String, enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
