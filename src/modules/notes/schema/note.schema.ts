import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NoteDocument = HydratedDocument<Note>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Note {
  @Prop({ unique: true })
  noteId: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Lead',
    required: true,
  })
  leadId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Customer',
  })
  customerId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Application',
  })
  applicationId?: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    required: true,
    trim: true,
  })
  note: string;

  @Prop({
    default: false,
  })
  isPinned: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  updatedBy?: Types.ObjectId;

  @Prop({
    default: false,
  })
  isDeleted: boolean;
}

export const NoteSchema =
  SchemaFactory.createForClass(Note);