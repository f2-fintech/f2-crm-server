import { Module } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { EligibilityController } from './eligibility.controller';

@Module({
  controllers: [EligibilityController],
  providers: [EligibilityService],
})
export class EligibilityModule {}
