import { Test, TestingModule } from '@nestjs/testing';
import { DocumentVerificationService } from './document-verification.service';

describe('DocumentVerificationService', () => {
  let service: DocumentVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentVerificationService],
    }).compile();

    service = module.get<DocumentVerificationService>(DocumentVerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
