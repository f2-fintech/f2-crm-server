import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  receiverId?: Types.ObjectId;

  @Prop({ required: false, index: true })
  channelId?: string;

  @Prop({ required: false, default: '' })
  text: string;

  @Prop({ required: false })
  attachmentUrl?: string;

  @Prop({ required: false })
  attachmentType?: string;

  @Prop({ required: false })
  attachmentName?: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

