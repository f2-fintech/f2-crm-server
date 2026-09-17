import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { Model } from 'mongoose';

import {
  Note,
  NoteDocument,
} from './schema/note.schema';

import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name)
    private readonly noteModel: Model<NoteDocument>,
  ) {}

  /**
   * Generate Note ID
   * Example: NOTE000001
   */
  private async generateNoteId(): Promise<string> {
    const latestNote = await this.noteModel
      .findOne()
      .sort({ createdAt: -1 })
      .select('noteId');

    if (!latestNote?.noteId) {
      return 'NOTE000001';
    }

    const lastNumber = parseInt(
      latestNote.noteId.replace('NOTE', ''),
      10,
    );

    return `NOTE${String(lastNumber + 1).padStart(
      6,
      '0',
    )}`;
  }

  /**
   * Create Note
   */
  async create(
    createNoteDto: CreateNoteDto,
  ) {
    const noteId = await this.generateNoteId();

    // Prevent duplicate note
    const exists = await this.noteModel.findOne({
      leadId: createNoteDto.leadId,
      title: createNoteDto.title,
      note: createNoteDto.note,
      isDeleted: false,
    });

    if (exists) {
      throw new ConflictException(
        'Note already exists.',
      );
    }

    const note = new this.noteModel({
      ...createNoteDto,
      noteId,
    });

    await note.save();

    return {
      success: true,
      message: 'Note created successfully.',
      data: note,
    };
  }
/**
 * Get All Notes
 */
async findAll(query: NoteQueryDto) {
  const {
    page = 1,
    limit = 10,
    search,
    leadId,
    customerId,
    applicationId,
    createdBy,
    isPinned,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter: Record<string, any> = {
    isDeleted: false,
  };

  // Search
  if (search) {
    filter.$or = [
      {
        noteId: {
          $regex: search,
          $options: 'i',
        },
      },
      {
        title: {
          $regex: search,
          $options: 'i',
        },
      },
      {
        note: {
          $regex: search,
          $options: 'i',
        },
      },
    ];
  }

  // Filters
  if (leadId) filter.leadId = leadId;
  if (customerId) filter.customerId = customerId;
  if (applicationId) filter.applicationId = applicationId;
  if (createdBy) filter.createdBy = createdBy;

  if (isPinned !== undefined) {
  filter.isPinned = isPinned;
}

  const skip = (page - 1) * limit;

  const [notes, total] = await Promise.all([
    this.noteModel
      .find(filter)
      .populate(
        'leadId',
        'leadId fullName mobile loanAmount',
      )
      .populate(
        'customerId',
        'customerId fullName phone',
      )
      .populate(
        'applicationId',
        'applicationId applicantName loanAmount status',
      )
      .populate(
        'createdBy',
        'firstName lastName employeeId',
      )
      .populate(
        'updatedBy',
        'firstName lastName employeeId',
      )
      .sort({
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      })
      .skip(skip)
      .limit(limit),

    this.noteModel.countDocuments(filter),
  ]);

  return {
    success: true,
    message: 'Notes fetched successfully.',
    data: notes,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Get Note By Id
 */
async findOne(id: string) {
  const note = await this.noteModel
    .findOne({
      _id: id,
      isDeleted: false,
    })
    .populate(
      'leadId',
      'leadId fullName mobile loanAmount',
    )
    .populate(
      'customerId',
      'customerId fullName phone',
    )
    .populate(
      'applicationId',
      'applicationId applicantName loanAmount status',
    )
    .populate(
      'createdBy',
      'firstName lastName employeeId',
    )
    .populate(
      'updatedBy',
      'firstName lastName employeeId',
    );

  if (!note) {
    throw new NotFoundException(
      'Note not found.',
    );
  }

  return {
    success: true,
    message: 'Note fetched successfully.',
    data: note,
  };
}
/**
 * Update Note
 */
async update(
  id: string,
  updateNoteDto: UpdateNoteDto,
) {
  const note = await this.noteModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!note) {
    throw new NotFoundException(
      'Note not found.',
    );
  }

  // Prevent duplicate note
  if (
    updateNoteDto.title &&
    updateNoteDto.note
  ) {
    const exists =
      await this.noteModel.findOne({
        _id: { $ne: id },
        leadId:
          updateNoteDto.leadId ??
          note.leadId,
        title:
          updateNoteDto.title,
        note:
          updateNoteDto.note,
        isDeleted: false,
      });

    if (exists) {
      throw new ConflictException(
        'Note already exists.',
      );
    }
  }

  const updatedNote =
    await this.noteModel.findByIdAndUpdate(
      id,
      {
        $set: updateNoteDto,
      },
      {
        new: true,
        runValidators: true,
      },
    );

  return {
    success: true,
    message: 'Note updated successfully.',
    data: updatedNote,
  };
}

/**
 * Soft Delete Note
 */
async remove(id: string) {
  const note = await this.noteModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!note) {
    throw new NotFoundException(
      'Note not found.',
    );
  }

  await this.noteModel.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
  );

  return {
    success: true,
    message: 'Note deleted successfully.',
  };
}
/**
 * Pin Note
 */
async pinNote(id: string) {
  const note = await this.noteModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!note) {
    throw new NotFoundException(
      'Note not found.',
    );
  }

  note.isPinned = true;

  await note.save();

  return {
    success: true,
    message: 'Note pinned successfully.',
    data: note,
  };
}

/**
 * Unpin Note
 */
async unPinNote(id: string) {
  const note = await this.noteModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!note) {
    throw new NotFoundException(
      'Note not found.',
    );
  }

  note.isPinned = false;

  await note.save();

  return {
    success: true,
    message: 'Note unpinned successfully.',
    data: note,
  };
}

/**
 * Get Lead Notes
 */
async getLeadNotes(leadId: string) {
  const data = await this.noteModel
    .find({
      leadId,
      isDeleted: false,
    })
    .populate(
      'createdBy',
      'firstName lastName employeeId',
    )
    .populate(
      'updatedBy',
      'firstName lastName employeeId',
    )
    .sort({
      isPinned: -1,
      createdAt: -1,
    });

  return {
    success: true,
    message: 'Lead notes fetched successfully.',
    data,
  };
};


/**
 * Dashboard Statistics
 */
async getDashboardStats() {
  const [
    totalNotes,
    pinnedNotes,
    unPinnedNotes,
  ] = await Promise.all([
    this.noteModel.countDocuments({
      isDeleted: false,
    }),

    this.noteModel.countDocuments({
      isPinned: true,
      isDeleted: false,
    }),

    this.noteModel.countDocuments({
      isPinned: false,
      isDeleted: false,
    }),
  ]);

  return {
    success: true,
    data: {
      totalNotes,
      pinnedNotes,
      unPinnedNotes,
    },
  };
}
}
