import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument, LeadStatus } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Timeline, TimelineDocument, TimelineAction, TimelineType } from '../timeline/schemas/timeline.schemas';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Timeline.name) private timelineModel: Model<TimelineDocument>,
  ) {}

  async create(createLeadDto: CreateLeadDto, userId?: any): Promise<Lead> {
    const leadId = 'L' + Date.now().toString();
    const createdLead = new this.leadModel({
      ...createLeadDto,
      leadId,
      status: LeadStatus.NEW,
    });
    
    const savedLead = await createdLead.save();

    // Log to Timeline
    await this.timelineModel.create({
      timelineId: 'T' + Date.now().toString(),
      entityType: TimelineType.LEAD,
      entityId: savedLead._id,
      action: TimelineAction.CREATED,
      title: 'Lead Created',
      description: `Lead for ${createLeadDto.fullName} was added to the system.`,
      metadata: { source: 'Manual Entry' },
      performedBy: userId,
    });

    return savedLead;
  }

  async findAll(query: any): Promise<any> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.leadModel.find({ isDeleted: false }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.leadModel.countDocuments({ isDeleted: false }),
    ]);

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
