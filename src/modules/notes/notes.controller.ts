import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { NotesService } from './notes.service';

import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';

@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
  ) {}

  /**
   * Create Note
   */
  @Post()
  create(
    @Body()
    createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create(
      createNoteDto,
    );
  }

  /**
   * Get All Notes
   */
  @Get()
  findAll(
    @Query()
    query: NoteQueryDto,
  ) {
    return this.notesService.findAll(query);
  }

  /**
   * Dashboard Statistics
   */
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.notesService.getDashboardStats();
  }

  /**
   * Lead Notes
   */
  @Get('lead/:leadId')
  getLeadNotes(
    @Param('leadId')
    leadId: string,
  ) {
    return this.notesService.getLeadNotes(
      leadId,
    );
  }

  /**
   * Get Note By Id
   */
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.notesService.findOne(id);
  }

  /**
   * Update Note
   */
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(
      id,
      updateNoteDto,
    );
  }

  /**
   * Pin Note
   */
  @Patch(':id/pin')
  pinNote(
    @Param('id')
    id: string,
  ) {
    return this.notesService.pinNote(id);
  }

  /**
   * Unpin Note
   */
  @Patch(':id/unpin')
  unPinNote(
    @Param('id')
    id: string,
  ) {
    return this.notesService.unPinNote(id);
  }

  /**
   * Delete Note
   */
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.notesService.remove(id);
  }
}