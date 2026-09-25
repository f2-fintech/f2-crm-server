import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  timestamps: true,
  collection: 'notifications',
})
export class Notification {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  recipient: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    required: true,
    trim: true,
  })
  message: string;

  @Prop({
    type: String,
    enum: ['PAGE_ASSIGNED', 'PAGE_SHARED', 'SYSTEM'],
    default: 'SYSTEM',
  })
  type: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'NotionPage',
    default: null,
  })
  relatedPageId?: Types.ObjectId;

  @Prop({
    default: false,
  })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
