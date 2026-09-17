import { Test, TestingModule } from '@nestjs/testing';
import { CibilController } from './cibil.controller';
import { CibilService } from './cibil.service';

describe('CibilController', () => {
  let controller: CibilController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CibilController],
      providers: [CibilService],
    }).compile();

    controller = module.get<CibilController>(CibilController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
