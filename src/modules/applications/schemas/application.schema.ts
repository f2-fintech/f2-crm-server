import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ApplicationDocument = HydratedDocument<Application>;

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
}

@Schema({
  timestamps: true,
  collection: 'applications',
})
export class Application {
  @Prop({
    required: true,
    unique: true,
  })
  applicationId: string;

  @Prop({
    default: '',
  })
  omsId: string;

  @Prop({
    default: '',
  })
  leadId: string;

  @Prop({
    default: '',
  })
  customerId: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  applicantName: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 15,
  })
  phone: string;

  @Prop({
    default: '',
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    required: true,
  })
  loanType: string;

  @Prop({
    required: true,
    min: 0,
  })
  loanAmount: number;

  @Prop({
    default: '',
  })
  lenderName: string;

  @Prop({
    default: '',
  })
  branchName: string;

  @Prop({
    type: String,
    enum: ApplicationStatus,
    default: ApplicationStatus.DRAFT,
  })
  status: ApplicationStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  assignedTo: MongooseSchema.Types.ObjectId;

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

export const ApplicationSchema =
  SchemaFactory.createForClass(Application);


// Text Search
ApplicationSchema.index({
  applicantName: 'text',
  phone: 'text',
  email: 'text',
});
