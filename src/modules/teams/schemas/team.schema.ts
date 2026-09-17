import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type TeamDocument = HydratedDocument<Team>;

@Schema({
  timestamps: true,
  collection: 'teams',
})
export class Team {
  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  name: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  managerId: Types.ObjectId;

  @Prop({
    trim: true,
    default: '',
  })
  description: string;

  @Prop({
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    default: [],
  })
  members: Types.ObjectId[];
}

export const TeamSchema = SchemaFactory.createForClass(Team);
