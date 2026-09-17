import { Module } from '@nestjs/common';
import { LendersService } from './lenders.service';
import { LendersController } from './lenders.controller';

@Module({
  controllers: [LendersController],
  providers: [LendersService],
})
export class LendersModule {}
