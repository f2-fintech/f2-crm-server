import { Injectable } from '@nestjs/common';
import { CreateDocumentVerificationDto } from './dto/create-document-verification.dto';
import { UpdateDocumentVerificationDto } from './dto/update-document-verification.dto';

@Injectable()
export class DocumentVerificationService {
  create(createDocumentVerificationDto: CreateDocumentVerificationDto) {
    return 'This action adds a new documentVerification';
  }

  findAll() {
    return `This action returns all documentVerification`;
  }

  findOne(id: number) {
    return `This action returns a #${id} documentVerification`;
  }

  update(id: number, updateDocumentVerificationDto: UpdateDocumentVerificationDto) {
    return `This action updates a #${id} documentVerification`;
  }

  remove(id: number) {
    return `This action removes a #${id} documentVerification`;
  }
}
