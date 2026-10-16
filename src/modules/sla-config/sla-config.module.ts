import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SlaConfig, SlaConfigSchema } from './schemas/sla-config.schema';
import { SlaConfigService } from './sla-config.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SlaConfig.name, schema: SlaConfigSchema },
    ]),
  ],
  providers: [SlaConfigService],
  exports: [SlaConfigService, MongooseModule],
})
export class SlaConfigModule {}
