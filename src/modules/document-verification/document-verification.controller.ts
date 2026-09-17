import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DocumentVerificationService } from './document-verification.service';
import { CreateDocumentVerificationDto } from './dto/create-document-verification.dto';
import { UpdateDocumentVerificationDto } from './dto/update-document-verification.dto';

@Controller('document-verification')
export class DocumentVerificationController {
  constructor(private readonly documentVerificationService: DocumentVerificationService) {}

  @Post()
  create(@Body() createDocumentVerificationDto: CreateDocumentVerificationDto) {
    return this.documentVerificationService.create(createDocumentVerificationDto);
  }

  @Get()
  findAll() {
    return this.documentVerificationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentVerificationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDocumentVerificationDto: UpdateDocumentVerificationDto) {
    return this.documentVerificationService.update(+id, updateDocumentVerificationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documentVerificationService.remove(+id);
  }
}
