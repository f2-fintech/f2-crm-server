import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DialerService } from './dialer.service';
import { DialerController } from './dialer.controller';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [DialerController],
  providers: [DialerService],
  exports: [DialerService],
})
export class DialerModule {}
