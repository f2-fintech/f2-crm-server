import { Module } from '@nestjs/common';
import { CallDispositionsService } from './call-dispositions.service';
import { CallDispositionsController } from './call-dispositions.controller';

@Module({
  controllers: [CallDispositionsController],
  providers: [CallDispositionsService],
})
export class CallDispositionsModule {}
