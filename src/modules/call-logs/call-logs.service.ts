import { Injectable } from '@nestjs/common';
import { CreateCallLogDto } from './dto/create-call-log.dto';
import { UpdateCallLogDto } from './dto/update-call-log.dto';

@Injectable()
export class CallLogsService {
  create(createCallLogDto: CreateCallLogDto) {
    return 'This action adds a new callLog';
  }

  findAll() {
    return `This action returns all callLogs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} callLog`;
  }

  update(id: number, updateCallLogDto: UpdateCallLogDto) {
    return `This action updates a #${id} callLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} callLog`;
  }
}
