import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument, LeadStatus } from './schemas/lead.schema';
import { Insight } from '../../common/interfaces/insight.interface';
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
  ) { }

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
    const { page = 1, limit = 10, isAssigned, search, status, isDoctor } = query;
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };

    // Safer search filter combination
    const finalFilter: any = { isDeleted: false };
    const andConditions: any[] = [];

    if (isAssigned === 'true') {
      andConditions.push({ $or: [{ assignedTo: { $exists: true, $ne: null } }, { omsUserId: { $exists: true, $ne: null } }, { omsAppliedByName: { $exists: true, $ne: '' } }] });
    } else if (isAssigned === 'false') {
      andConditions.push({ $and: [{ assignedTo: { $exists: false } }, { omsUserId: null }, { $or: [{ omsAppliedByName: { $exists: false } }, { omsAppliedByName: '' }] }] });
    }

    if (isDoctor === 'true') {
      andConditions.push({
        $or: [
          { fullName: { $regex: '^dr\\.?\\s', $options: 'i' } },
          { loanType: { $regex: 'doctor', $options: 'i' } },
          { omsLeadType: { $regex: 'doctor', $options: 'i' } }
        ]
      });
    }

    if (search) {
      andConditions.push({
        $or: [
          { fullName: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
          { loanType: new RegExp(search, 'i') },
          { omsLeadType: new RegExp(search, 'i') }
        ]
      });
    }

    if (status) {
      if (['APPROVED', 'REJECTED', 'DISBURSED'].includes(status.toUpperCase())) {
        andConditions.push({ omsTicketStatus: { $regex: status, $options: 'i' } });
      } else if (status === 'FOLLOW_UP') {
        andConditions.push({ status: { $nin: [LeadStatus.CONVERTED, LeadStatus.LOST] } });
      } else {
        andConditions.push({ status });
      }
    }

    if (andConditions.length > 0) {
      finalFilter.$and = andConditions;
    }

    const parsedLimit = Number(limit) || 10;
    const parsedSkip = Number(skip) || 0;

    const [data, total] = await Promise.all([
      this.leadModel.aggregate([
        { $match: finalFilter },
        { $sort: { createdAt: -1 } },
        { $skip: parsedSkip },
        { $limit: parsedLimit },
        {
          $lookup: {
            from: "timelines", // Name of the timelines collection
            localField: "_id",
            foreignField: "entityId",
            as: "timelineItems"
          }
        },
        {
          $addFields: {
            touchpointsCount: { $size: "$timelineItems" },
            latestTimelineItem: { $arrayElemAt: ["$timelineItems", -1] },
            id: { $toString: "$_id" }
          }
        },
        { $project: { timelineItems: 0 } }
      ]),
      this.leadModel.countDocuments(finalFilter),
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

  async getDashboardStats(): Promise<any> {
    const [totalLeads, convertedLeads, approvedLeads, rejectedLeads, disbursedLeads, activeLeads, newLeads] = await Promise.all([
      this.leadModel.countDocuments({ isDeleted: false }),
      this.leadModel.countDocuments({ isDeleted: false, status: LeadStatus.CONVERTED }),
      this.leadModel.countDocuments({ isDeleted: false, omsTicketStatus: { $regex: 'approved', $options: 'i' } }),
      this.leadModel.countDocuments({ isDeleted: false, omsTicketStatus: { $regex: 'rejected', $options: 'i' } }),
      this.leadModel.countDocuments({ isDeleted: false, omsTicketStatus: { $regex: 'disbursed', $options: 'i' } }),
      this.leadModel.countDocuments({
        isDeleted: false,
        status: { $nin: [LeadStatus.CONVERTED, LeadStatus.LOST] }
      }),
      this.leadModel.countDocuments({ isDeleted: false, status: LeadStatus.NEW })
    ]);

    // Source distribution
    const sourceStats = await this.leadModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$leadSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 100 }
    ]);

    // Active aging > 14 days
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const inactiveLeads = await this.leadModel.countDocuments({
      isDeleted: false,
      status: { $nin: [LeadStatus.CONVERTED, LeadStatus.LOST] },
      updatedAt: { $lt: twoWeeksAgo }
    });

    const insights: Insight[] = [];

    if (inactiveLeads > 0) {
      insights.push({
        title: "Idle Leads",
        metric: inactiveLeads,
        explanation: "No recent activity is recorded for these leads.",
        severity: "info",
        action: { label: "View Idle", href: "/leads?status=active" }
      });
    }

    if (newLeads > 0) {
      insights.push({
        title: "New Leads",
        metric: newLeads,
        explanation: "Leads that have just entered the system.",
        severity: "info"
      });
    }

    if (sourceStats.length > 0) {
      // Find specific sources (case insensitive check)
      const dialerSource = sourceStats.find(s => String(s._id).toLowerCase() === 'dialler' || String(s._id).toLowerCase() === 'dialer');
      const notionSource = sourceStats.find(s => String(s._id).toLowerCase() === 'notion');

      if (dialerSource) {
        insights.push({
          title: "Dialer Leads",
          metric: dialerSource.count,
          explanation: `Leads generated through the dialer integration.`,
          severity: "info"
        });
      }

      if (notionSource) {
        insights.push({
          title: "Notion Leads",
          metric: notionSource.count,
          explanation: `Leads captured via Notion.`,
          severity: "info"
        });
      }

      // If neither exists but we still have a top source, show it
      if (!dialerSource && !notionSource) {
        const topSource = sourceStats[0];
        insights.push({
          title: "Top Lead Source",
          metric: topSource._id || "Unknown",
          explanation: `Highest volume source with ${topSource.count} leads generated.`,
          severity: "info"
        });
      }
    }

    let conversionRate = 0;
    if (totalLeads > 0) {
      conversionRate = Math.round((convertedLeads / totalLeads) * 100);
      if (conversionRate > 0) {
        insights.push({
          title: "Conversion Rate",
          metric: `${conversionRate}%`,
          explanation: `Overall lead to customer conversion rate.`,
          severity: "info"
        });
      }
    }

    const doctorLeadsList = await this.leadModel.find({
      isDeleted: false,
      $or: [
        { loanType: { $regex: 'doctor', $options: 'i' } },
        { omsLeadType: { $regex: 'doctor', $options: 'i' } }
      ]
    });

    let doctorApproved = 0;
    let doctorRejected = 0;
    let doctorDisbursed = 0;
    let doctorPending = 0;

    doctorLeadsList.forEach(lead => {
      const s = (lead.omsTicketStatus || '').toLowerCase();
      if (s.includes('disburse')) doctorDisbursed++;
      else if (s.includes('approv')) doctorApproved++;
      else if (s.includes('reject')) doctorRejected++;
      else doctorPending++;
    });

    return {
      success: true,
      data: {
        overview: {
          totalLeads,
          approvedLeads,
          rejectedLeads,
          disbursedLeads,
          followUpLeads: activeLeads,
        },
        doctorStats: {
          total: doctorLeadsList.length,
          approved: doctorApproved,
          rejected: doctorRejected,
          disbursed: doctorDisbursed,
          pending: doctorPending
        },
        performance: {
          todayLeads: newLeads,
          conversionRate,
        },
        insights
      },
    };
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadModel.findOne({ _id: id, isDeleted: false });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, updateData: any, userId?: any): Promise<Lead> {
    const lead = await this.leadModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updateData },
      { new: true }
    );
    if (!lead) throw new NotFoundException('Lead not found');

    if (updateData.assignedTo) {
      await this.timelineModel.create({
        timelineId: 'T' + Date.now().toString(),
        entityType: TimelineType.LEAD,
        entityId: lead._id,
        action: TimelineAction.ASSIGNED,
        title: 'Lead Assigned',
        description: `Lead was assigned to a team member.`,
        performedBy: userId,
      });

      await this.lifecycleEventsService.transitionStage({
        entityType: 'Lead',
        entityId: lead._id.toString(),
        leadId: lead._id.toString(),
        eventType: LifecycleEventType.LEAD_ASSIGNED,
        toStage: lead.status,
        performedBy: userId,
        source: LifecycleEventSource.CRM,
      });
    } else {
      await this.timelineModel.create({
        timelineId: 'T' + Date.now().toString(),
        entityType: TimelineType.LEAD,
        entityId: lead._id,
        action: TimelineAction.UPDATED,
        title: 'Lead Updated',
        description: 'Lead details were updated',
        performedBy: userId,
      });
    }

    return lead;
  }

  async remove(id: string, userId?: any): Promise<{ success: boolean }> {
    const lead = await this.leadModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
    if (!lead) throw new NotFoundException('Lead not found');

    await this.timelineModel.create({
      timelineId: 'T' + Date.now().toString(),
      entityType: TimelineType.LEAD,
      entityId: lead._id,
      action: TimelineAction.UPDATED,
      title: 'Lead Deleted',
      description: 'Lead was marked as deleted',
      performedBy: userId,
    });

    return { success: true };
  }

  /**
   * Sync Leads from OMS automatically every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncOmsLeads(startDate?: string, endDate?: string) {
    const OMS_BASE_URL = process.env.OMS_BASE_URL || 'https://admin.f2fintech.in';
    const OMS_COMPANY_ID = process.env.OMS_COMPANY_ID || '101';

    try {
      let url = `${OMS_BASE_URL}/api/v1/get-all-tickets?companyId=${OMS_COMPANY_ID}&page=1&limit=1000`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: { 'companyid': OMS_COMPANY_ID }
      });

      if (!response.ok) {
        throw new Error(`OMS API returned ${response.status}`);
      }

      const payload = await response.json();
      const results = payload?.data?.results || [];

      let created = 0;
      let skipped = 0;

      for (const item of results) {
        const phone = item.customerContact;
        if (!phone) {
          skipped++;
          continue;
        }

        const existingLead = await this.leadModel.findOne({ phone, isDeleted: false });

        const omsTicketStatus = item.ticketStatus || item.loanStatus || '';
        const omsApprovedAmount = parseFloat(item.approvedAmount) || 0;
        const omsDisbursedAmount = parseFloat(item.disbursedAmount) || 0;
        const omsUserId = item.user_id || null;
        const omsTicketId = item.ticketId || item.ticket_id || null;
        const omsAppliedByName = item.appliedByName || '';
        const omsProvider = item.applicationProvider || item.provider || '';
        const omsTenure = parseInt(item.applicationTenure) || 0;
        const omsLeadType = item.leadType || '';

        if (!existingLead) {
          const leadId = 'L' + Date.now().toString() + Math.floor(Math.random() * 1000);

          const newLead = new this.leadModel({
            leadId,
            fullName: item.customerName || 'Unknown OMS Lead',
            phone: phone,
            email: item.customerEmail || '',
            city: item.customerLocation || '',
            loanType: item.loanType || '',
            loanAmount: parseFloat(item.applicationAmount) || 0,
            leadSource: item.leadType || item.source || 'OMS',
            status: LeadStatus.NEW,
            omsTicketStatus,
            omsApprovedAmount,
            omsDisbursedAmount,
            omsUserId,
            omsTicketId,
            omsAppliedByName,
            omsProvider,
            omsTenure,
            omsLeadType
          });

          await newLead.save();

          await this.timelineModel.create({
            timelineId: 'T' + Date.now().toString() + Math.floor(Math.random() * 1000),
            entityType: TimelineType.LEAD,
            entityId: newLead._id,
            action: TimelineAction.CREATED,
            title: 'Lead Synced from OMS',
            description: `Lead created via OMS Sync from ticket ${item.ticketId || item.applicationId}`,
            metadata: { omsApplicationId: item.applicationId, source: 'OMS' },
          });

          await this.lifecycleEventsService.transitionStage({
            entityType: 'Lead',
            entityId: newLead._id.toString(),
            leadId: newLead._id.toString(),
            eventType: LifecycleEventType.LEAD_CREATED,
            toStage: LeadStatus.NEW,
            source: LifecycleEventSource.OMS,
            omsId: String(item.applicationId),
          });

          if (item.ticketId) {
            await this.syncTicketHistory(item.ticketId, newLead._id, OMS_BASE_URL, OMS_COMPANY_ID);
          }

          created++;
        } else {
          // Update existing lead with latest OMS ticket status
          existingLead.omsTicketStatus = omsTicketStatus;
          existingLead.omsApprovedAmount = omsApprovedAmount;
          existingLead.omsDisbursedAmount = omsDisbursedAmount;
          existingLead.omsUserId = omsUserId;
          existingLead.omsTicketId = omsTicketId;
          if (omsAppliedByName) existingLead.omsAppliedByName = omsAppliedByName;
          existingLead.omsProvider = omsProvider;
          existingLead.omsTenure = omsTenure;
          existingLead.omsLeadType = omsLeadType;
          await existingLead.save();

          if (item.ticketId) {
            await this.syncTicketHistory(item.ticketId, existingLead._id, OMS_BASE_URL, OMS_COMPANY_ID);
          }

          skipped++;
        }
      }

      return { success: true, created, skipped };
    } catch (err: any) {
      console.error(`Failed to sync OMS leads: ${err.message}`);
      return { success: false, message: err.message };
    }
  }

  private async syncTicketHistory(ticketId: number, leadId: any, OMS_BASE_URL: string, OMS_COMPANY_ID: string) {
    try {
      const res = await fetch(`${OMS_BASE_URL}/api/v1/get-ticket-histories/${ticketId}`, {
        headers: { 'companyid': OMS_COMPANY_ID }
      });
      if (!res.ok) return;
      const json = await res.json();
      const histories = json?.data || [];

      for (const hist of histories) {
        if (!hist.id) continue;
        const exists = await this.timelineModel.findOne({ 'metadata.omsHistoryId': hist.id });
        if (!exists) {
          await this.timelineModel.create({
            timelineId: 'T' + Date.now().toString() + Math.floor(Math.random() * 1000),
            entityType: TimelineType.LEAD,
            entityId: leadId,
            action: TimelineAction.ACTIVITY,
            title: 'OMS Action',
            description: hist.action || 'Ticket updated',
            metadata: { omsHistoryId: hist.id, source: 'OMS' },
            createdAt: hist.created_at ? new Date(hist.created_at) : new Date(),
          } as any);
        }
      }
    } catch (err) {
      console.error(`Failed to sync history for ticket ${ticketId}`, err);
    }
  }
}

