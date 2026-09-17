import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BackupsService } from './backups.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { UpdateBackupDto } from './dto/update-backup.dto';

@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post()
  create(@Body() createBackupDto: CreateBackupDto) {
    return this.backupsService.create(createBackupDto);
  }

  @Get()
  findAll() {
    return this.backupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.backupsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBackupDto: UpdateBackupDto) {
    return this.backupsService.update(+id, updateBackupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.backupsService.remove(+id);
  }
}
