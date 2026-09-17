import { Module } from '@nestjs/common';
import { DialerService } from './dialer.service';
import { DialerController } from './dialer.controller';

@Module({
  controllers: [DialerController],
  providers: [DialerService],
})
export class DialerModule {}
