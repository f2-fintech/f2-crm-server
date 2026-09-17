import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { UpdateDisbursementDto } from './dto/update-disbursement.dto';

@Controller('disbursements')
export class DisbursementsController {
  constructor(private readonly disbursementsService: DisbursementsService) {}

  @Post()
  create(@Body() createDisbursementDto: CreateDisbursementDto) {
    return this.disbursementsService.create(createDisbursementDto);
  }

  @Get()
  findAll() {
    return this.disbursementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disbursementsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDisbursementDto: UpdateDisbursementDto) {
    return this.disbursementsService.update(+id, updateDisbursementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.disbursementsService.remove(+id);
  }
}
