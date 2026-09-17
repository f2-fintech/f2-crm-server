import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NotionPageDocument = HydratedDocument<NotionPage>;

@Schema({
  timestamps: true,
  collection: 'notion_pages',
})
export class NotionPage {
  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    default: '📄',
  })
  icon: string;

  @Prop({
    type: String,
    enum: ['PAGE', 'SHEET', 'DATABASE'],
    default: 'SHEET',
  })
  pageType: string;

  @Prop({
    type: String,
    enum: ['PRIVATE', 'SHARED', 'WORKSPACE'],
    default: 'SHARED',
  })
  section: string;

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  rows: any[];

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  columns: any[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Team',
    default: null,
  })
  teamId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'NotionPage',
    default: null,
  })
  parentPageId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  sharedWith: MongooseSchema.Types.ObjectId[];
  
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  assignedMemberId: MongooseSchema.Types.ObjectId;
  
  @Prop({
    default: false,
  })
  isDeleted: boolean;
}

export const NotionPageSchema = SchemaFactory.createForClass(NotionPage);
