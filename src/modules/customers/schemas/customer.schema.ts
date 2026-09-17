import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CLOSED = 'CLOSED',
}

@Schema({
  timestamps: true,
  collection: 'customers',
})
export class Customer {
  @Prop({
    unique: true,
    required: true,
    trim: true,
  })
    customerId: string;

  @Prop({
    default: '',
  })
  leadId: string;

  @Prop({
    default: '',
  })
  applicationId: string;

  @Prop({
    default: '',
  })
  omsId: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  fullName: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 15,
  })
  phone: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 15,
  })
  alternatePhone: string;

  @Prop({
    default: '',
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ default: '' })
  city: string;

  @Prop({ default: '' })
  state: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  pan: string;

  @Prop({ default: '' })
  aadhaar: string;

  @Prop({ default: '' })
  loanType: string;

  @Prop({ default: 0 })
  loanAmount: number;

  @Prop({ default: '' })
  employmentType: string;

  @Prop({ default: '' })
  companyName: string;

  @Prop({
    type: String,
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Branch',
    default: null,
  })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  relationshipManager: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  updatedBy: MongooseSchema.Types.ObjectId;

  @Prop({
    default: '',
  })
  remarks: string;

  @Prop({
    default: false,
  })
  isDeleted: boolean;
}

export const CustomerSchema =
  SchemaFactory.createForClass(Customer);

/* ---------- Indexes ---------- */


CustomerSchema.index({
  fullName: 'text',
  email: 'text',
  phone: 'text',
});
