import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument, LeadStatus } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import {
  Timeline,
  TimelineDocument,
  TimelineAction,
  TimelineType,
} from '../timeline/schemas/timeline.schemas';
import {
  Customer,
  CustomerDocument,
  CustomerStatus,
} from '../customers/schemas/customer.schema';
import { LifecycleEventsService } from '../lifecycle-events/lifecycle-events.service';
import {
  LifecycleEventType,
  LifecycleEventSource,
} from '../lifecycle-events/enums/lifecycle.enum';

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Timeline.name) private timelineModel: Model<TimelineDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private readonly lifecycleEventsService: LifecycleEventsService,
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
    // Record Lifecycle Event
    await this.lifecycleEventsService.transitionStage({
      entityType: 'Lead',
      entityId: savedLead._id.toString(),
      leadId: savedLead._id.toString(),
      eventType: LifecycleEventType.LEAD_CREATED,
      toStage: LeadStatus.NEW,
      performedBy: userId,
      source: LifecycleEventSource.CRM,
    });

    return savedLead;
  }

  async findAll(query: any): Promise<any> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.leadModel
        .find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
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

  async addDocument(
    id: string,
    body: { type: string; url: string },
    userId?: any,
  ): Promise<Lead> {
    const lead = await this.leadModel.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');

    lead.documents.push({ type: body.type, url: body.url, verified: false });
    const savedLead = await lead.save();

    await this.timelineModel.create({
      timelineId: 'T' + Date.now().toString(),
      entityType: TimelineType.LEAD,
      entityId: savedLead._id,
      action: TimelineAction.UPDATED,
      title: 'Document Added',
      description: `Document of type ${body.type} was uploaded.`,
      performedBy: userId,
    });

    return savedLead;
  }

  async convertToCustomer(id: string, userId?: any): Promise<Customer> {
    const lead = await this.leadModel.findById(id);
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === LeadStatus.CONVERTED) {
      throw new BadRequestException('Lead is already converted to a customer');
    }

    const customerId = 'CUS' + Date.now().toString();
    const customer = new this.customerModel({
      customerId,
      leadId: lead._id.toString(),
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      loanType: lead.loanType,
      loanAmount: lead.loanAmount,
      status: CustomerStatus.ACTIVE,
    });

    const savedCustomer = await customer.save();

    lead.status = LeadStatus.CONVERTED;
    await lead.save();

    await this.timelineModel.create({
      timelineId: 'T' + Date.now().toString(),
      entityType: TimelineType.LEAD,
      entityId: lead._id,
      action: TimelineAction.UPDATED,
      title: 'Lead Converted',
      description: `Lead successfully converted to Customer (${customerId}).`,
      performedBy: userId,
    });
    await this.lifecycleEventsService.transitionStage({
      entityType: 'Lead',
      entityId: lead._id.toString(),
      leadId: lead._id.toString(),
      customerId: savedCustomer._id.toString(),
      eventType: LifecycleEventType.LEAD_CONVERTED,
      fromStage: lead.status,
      toStage: LeadStatus.CONVERTED,
      performedBy: userId,
      source: LifecycleEventSource.CRM,
    });

    await this.lifecycleEventsService.transitionStage({
      entityType: 'Customer',
      entityId: savedCustomer._id.toString(),
      leadId: lead._id.toString(),
      customerId: savedCustomer._id.toString(),
      eventType: LifecycleEventType.CUSTOMER_CREATED,
      toStage: CustomerStatus.ACTIVE,
      performedBy: userId,
      source: LifecycleEventSource.CRM,
    });

    return savedCustomer;
  }
}
