import { Injectable } from '@nestjs/common';
import { CreateImportExportDto } from './dto/create-import-export.dto';
import { UpdateImportExportDto } from './dto/update-import-export.dto';

@Injectable()
export class ImportExportService {
  create(createImportExportDto: CreateImportExportDto) {
    return 'This action adds a new importExport';
  }

  findAll() {
    return `This action returns all importExport`;
  }

  findOne(id: number) {
    return `This action returns a #${id} importExport`;
  }

  update(id: number, updateImportExportDto: UpdateImportExportDto) {
    return `This action updates a #${id} importExport`;
  }

  remove(id: number) {
    return `This action removes a #${id} importExport`;
  }
}
