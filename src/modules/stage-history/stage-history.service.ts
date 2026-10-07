import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  StageHistory,
  StageHistoryDocument,
} from './schemas/stage-history.schema';
import { LifecycleEventSource } from '../lifecycle-events/enums/lifecycle.enum';

@Injectable()
export class StageHistoryService {
  private readonly logger = new Logger(StageHistoryService.name);

  constructor(
    @InjectModel(StageHistory.name)
    private readonly stageHistoryModel: Model<StageHistoryDocument>,
  ) {}

  async closeCurrentStage(
    entityType: string,
    entityId: string,
    exitedAt: Date = new Date(),
  ): Promise<StageHistoryDocument | null> {
    const currentStage = await this.stageHistoryModel
      .findOne({
        entityType,
        entityId,
        exitedAt: null,
      })
      .sort({ enteredAt: -1 });

    if (!currentStage) {
      return null;
    }

    currentStage.exitedAt = exitedAt;
    currentStage.durationSeconds = Math.floor(
      (exitedAt.getTime() - currentStage.enteredAt.getTime()) / 1000,
    );

    return currentStage.save();
  }

  async startNewStage(data: {
    entityType: string;
    entityId: string;
    leadId?: string;
    customerId?: string;
    applicationId?: string;
    stage: string;
    ownerId?: Types.ObjectId;
    source: LifecycleEventSource;
    enteredAt?: Date;
  }): Promise<StageHistoryDocument> {
    const enteredAt = data.enteredAt || new Date();

    // Safety check: close any existing open stage first, just in case
    await this.closeCurrentStage(data.entityType, data.entityId, enteredAt);

    const newStage = new this.stageHistoryModel({
      ...data,
      enteredAt,
    });

    return newStage.save();
  }

  async getStageHistory(entityType: string, entityId: string) {
    const history = await this.stageHistoryModel
      .find({ entityType, entityId })
      .sort({ enteredAt: 1 })
      .lean();
    return { success: true, data: history };
  }

  async getStageHistoryRaw(entityType: string, entityId: string) {
    return this.stageHistoryModel
      .find({ entityType, entityId })
      .sort({ enteredAt: 1 })
      .lean();
  }

  async getCurrentStage(entityType: string, entityId: string) {
    return this.stageHistoryModel
      .findOne({ entityType, entityId, exitedAt: null })
      .sort({ enteredAt: -1 })
      .lean();
  }
}
