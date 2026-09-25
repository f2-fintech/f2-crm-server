import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { Role } from '../../roles/schemas/role.schema';
import { Branch } from '../../branches/schemas/branch.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
  })
  employeeId: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  firstName: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 50,
  })
  lastName: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  email: string;

  @Prop({
    required: false,
    unique: true,
    sparse: true,
    trim: true,
  })
  phone?: string;

  @Prop({
    required: true,
    select: false,
  })
  password: string;

  @Prop({
    type: String,
    enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE', 'SOURCER', 'CHANNEL_PARTNER'],
    default: 'EMPLOYEE',
    required: true,
    uppercase: true,
  })
  role: string;

  @Prop({
    type: Types.ObjectId,
    ref: Role.name,
    required: false,
  })
  roleId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Branch.name,
    required: false,
  })
  branchId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Department',
    required: false,
  })
  departmentId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Team',
    required: false,
  })
  teamId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  reportsTo?: Types.ObjectId;

  @Prop({
    default: '',
  })
  profileImage: string;

  @Prop({
    default: true,
  })
  isActive: boolean;

  @Prop({
    default: null,
  })
  lastLogin: Date;

  @Prop({
    default: '',
    select: false,
  })
  refreshToken: string;

  @Prop({
    default: 0,
  })
  loginAttempts: number;

  @Prop({
    default: false,
  })
  isLocked: boolean;

  @Prop({ type: Object, default: {} })
  address: {
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
    streetAddress?: string;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

/**
 * Virtual Full Name
 */
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});