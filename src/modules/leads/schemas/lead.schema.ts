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

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

class DocumentItem {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: false })
  verified: boolean;
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

  // --- OMS Ticket Data ---
  @Prop({ default: null })
  omsTicketId: number;

  @Prop({ default: '' })
  omsTicketStatus: string;

  @Prop({ default: 0 })
  omsApprovedAmount: number;

  @Prop({ default: 0 })
  omsDisbursedAmount: number;

  @Prop({ default: null })
  omsUserId: number;

  @Prop({ default: '' })
  omsAppliedByName: string;

  @Prop({ default: '' })
  omsProvider: string;

  @Prop({ default: 0 })
  omsTenure: number;

  @Prop({ default: '' })
  omsLeadType: string;

  @Prop({ type: String, enum: KycStatus, default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Prop({ default: 0 })
  monthlyIncome: number;

  @Prop({ default: '' })
  leadSource: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  assignedTo: string;

  @Prop({ type: [DocumentItem], default: [] })
  documents: DocumentItem[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
