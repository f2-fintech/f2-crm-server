import { Module } from '@nestjs/common';
import { DocumentVerificationService } from './document-verification.service';
import { DocumentVerificationController } from './document-verification.controller';

@Module({
  controllers: [DocumentVerificationController],
  providers: [DocumentVerificationService],
})
export class DocumentVerificationModule {}
