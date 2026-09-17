import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NotionLeadDocument = HydratedDocument<NotionLead>;

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CALL_BACK = 'CALL_BACK',
}

@Schema({
  timestamps: true,
  collection: 'notion_leads',
})
export class NotionLead {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'NotionPage',
    required: true,
  })
  pageId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  data: Record<string, any>; // Stores dynamic columns pasted from excel

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    default: null,
  })
  assignedTo: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  @Prop({
    default: null,
  })
  callBackTime: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({
    default: false,
  })
  isDeleted: boolean;
}

export const NotionLeadSchema = SchemaFactory.createForClass(NotionLead);
