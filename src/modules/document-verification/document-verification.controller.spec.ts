import { Test, TestingModule } from '@nestjs/testing';
import { DocumentVerificationController } from './document-verification.controller';
import { DocumentVerificationService } from './document-verification.service';

describe('DocumentVerificationController', () => {
  let controller: DocumentVerificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentVerificationController],
      providers: [DocumentVerificationService],
    }).compile();

    controller = module.get<DocumentVerificationController>(DocumentVerificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
