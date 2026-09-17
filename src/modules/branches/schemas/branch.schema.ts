import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BranchDocument = HydratedDocument<Branch>;

@Schema({
  timestamps: true,
  collection: 'branches',
})
export class Branch {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 20,
  })
  branchCode: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  branchName: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  city: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  state: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 300,
  })
  address: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 20,
  })
  phone: string;

  @Prop({
    default: '',
    trim: true,
    lowercase: true,
  })
  email: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 100,
  })
  manager: string;

  @Prop({
    default: true,
  })
  isActive: boolean;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

/**
 * Indexes
 */
BranchSchema.index({ branchName: 1 });
BranchSchema.index({ city: 1 });