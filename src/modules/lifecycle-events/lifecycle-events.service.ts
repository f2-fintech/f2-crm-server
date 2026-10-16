import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LifecycleEvent, LifecycleEventDocument } from './schemas/lifecycle-event.schema';
import { StageHistoryService } from '../stage-history/stage-history.service';
import { LifecycleEventType, LifecycleEventSource } from './enums/lifecycle.enum';
import { LifecycleQueryDto } from './dto/lifecycle-query.dto';
import { SlaConfigService } from '../sla-config/sla-config.service';

@Injectable()
export class LifecycleEventsService {
  private readonly logger = new Logger(LifecycleEventsService.name);

  constructor(
    @InjectModel(LifecycleEvent.name) private readonly eventModel: Model<LifecycleEventDocument>,
    @Inject(forwardRef(() => StageHistoryService))
    private readonly stageHistoryService: StageHistoryService,
    private readonly slaConfigService: SlaConfigService,
  ) {}

  async transitionStage(data: {
    entityType: string;
    entityId: string;
    leadId?: string;
    customerId?: string;
    applicationId?: string;
    omsId?: string;
    eventType: LifecycleEventType;
    fromStage?: string;
    toStage?: string;
    performedBy?: Types.ObjectId;
    ownerId?: Types.ObjectId;
    source: LifecycleEventSource;
    remarks?: string;
    reason?: string;
    metadata?: any;
  }) {
    const timestamp = new Date();

    try {
      await this.stageHistoryService.closeCurrentStage(data.entityType, data.entityId, timestamp);

      if (data.toStage) {
        await this.stageHistoryService.startNewStage({
          entityType: data.entityType,
          entityId: data.entityId,
          leadId: data.leadId,
          customerId: data.customerId,
          applicationId: data.applicationId,
          stage: data.toStage,
          ownerId: data.ownerId,
          source: data.source,
          enteredAt: timestamp,
        });
      }

      const event = new this.eventModel({
        ...data,
      });
      await event.save();

      return event;
    } catch (error) {
      this.logger.error(
        `Failed to transition stage for ${data.entityType} ${data.entityId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async getEvents(entityType: string, entityId: string, query: LifecycleQueryDto) {
    const { page = 1, limit = 20, eventType, source, fromStage, toStage } = query;
    const filter: any = { entityType, entityId };
    
    if (eventType) filter.eventType = eventType;
    if (source) filter.source = source;
    if (fromStage) filter.fromStage = fromStage;
    if (toStage) filter.toStage = toStage;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.eventModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.eventModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTimeline(entityType: string, entityId: string) {
    // Basic implementation: fetch both and sort in memory (or use aggregation)
    const events = await this.eventModel.find({ entityType, entityId }).lean();
    const stages = await this.stageHistoryService.getStageHistoryRaw(entityType, entityId);

    const timeline = [
      ...events.map(e => ({ ...e, recordType: 'EVENT', timestamp: (e as any).createdAt })),
      ...stages.map(s => ({ ...s, recordType: 'STAGE_HISTORY', timestamp: (s as any).enteredAt }))
    ].sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      success: true,
      data: timeline,
    };
  }

  async getCurrentSummary(entityType: string, entityId: string) {
    const currentStage = await this.stageHistoryService.getCurrentStage(entityType, entityId);
    if (!currentStage) {
      return { success: true, data: null };
    }

    const lastEvent = await this.eventModel.findOne({ entityType, entityId }).sort({ createdAt: -1 });

    const now = new Date();
    const ageSeconds = Math.floor((now.getTime() - currentStage.enteredAt.getTime()) / 1000);
    const durationDays = ageSeconds / 86400;

    // Check SLA
    const slas = await this.slaConfigService.findAll();
    const activeSla = slas.find(s => s.entityType === entityType && s.stage === currentStage.stage && s.isEnabled);
    
    let slaState = 'NOT_CONFIGURED';
    let slaAllowedDays: number | null = null;

    if (activeSla) {
      slaAllowedDays = activeSla.durationDays;
      if (durationDays > activeSla.durationDays) slaState = 'BREACHED';
      else if (durationDays >= activeSla.durationDays * 0.8) slaState = 'AT_RISK';
      else slaState = 'WITHIN_SLA';
    }

    return {
      success: true,
      data: {
        currentStage: currentStage.stage,
        stageEnteredAt: currentStage.enteredAt,
        currentStageAgeSeconds: ageSeconds,
        currentStageAgeHours: Math.floor(ageSeconds / 3600),
        currentStageAgeDays: Math.floor(ageSeconds / 86400),
        currentStageOwnerId: currentStage.ownerId,
        lastLifecycleEventAt: lastEvent ? (lastEvent as any).createdAt : null,
        lastEventType: lastEvent ? lastEvent.eventType : null,
        source: currentStage.source,
        slaState,
        slaAllowedDays
      }
    };
  }
}
