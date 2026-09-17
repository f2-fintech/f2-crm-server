import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({
  timestamps: true,
  collection: 'permissions',
})
export class Permission {
  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
  })
  module: string;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
  })
  action: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
  })
  key: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 500,
  })
  description: string;

  @Prop({
    default: true,
  })
  isActive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

PermissionSchema.index(
  {
    module: 1,
    action: 1,
  },
  {
    unique: true,
  },
);