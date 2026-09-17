import { Test, TestingModule } from '@nestjs/testing';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';

describe('ImportExportController', () => {
  let controller: ImportExportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportExportController],
      providers: [ImportExportService],
    }).compile();

    controller = module.get<ImportExportController>(ImportExportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
