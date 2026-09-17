import { Module } from '@nestjs/common';
import { CibilService } from './cibil.service';
import { CibilController } from './cibil.controller';

@Module({
  controllers: [CibilController],
  providers: [CibilService],
})
export class CibilModule {}
