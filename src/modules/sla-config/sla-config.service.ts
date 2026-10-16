import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SlaConfig, SlaConfigDocument } from './schemas/sla-config.schema';

@Injectable()
export class SlaConfigService implements OnModuleInit {
  private readonly logger = new Logger(SlaConfigService.name);

  constructor(
    @InjectModel(SlaConfig.name) private slaConfigModel: Model<SlaConfigDocument>
  ) {}

  async onModuleInit() {
    await this.seedDefaultSlas();
  }

  private async seedDefaultSlas() {
    const existingCount = await this.slaConfigModel.countDocuments();
    if (existingCount > 0) return;

    this.logger.log('Seeding default SLA configurations...');
    const defaults = [
      { entityType: 'Lead', stage: 'NEW', durationDays: 1, isEnabled: true },
      { entityType: 'Lead', stage: 'FOLLOW_UP', durationDays: 2, isEnabled: true },
      { entityType: 'Application', stage: 'DRAFT', durationDays: 3, isEnabled: true },
      { entityType: 'Application', stage: 'UNDER_REVIEW', durationDays: 4, isEnabled: true },
      { entityType: 'Application', stage: 'APPROVED', durationDays: 5, isEnabled: true },
    ];

    for (const conf of defaults) {
      await this.slaConfigModel.updateOne(
        { entityType: conf.entityType, stage: conf.stage },
        { $set: conf },
        { upsert: true }
      );
    }
  }

  async findAll() {
    return this.slaConfigModel.find().exec();
  }
}
