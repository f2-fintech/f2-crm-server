import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  FollowUp,
  FollowUpDocument,
  FollowUpStatus,
} from './schemas/follow-up.schema';

import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpQueryDto } from './dto/follow-up-query.dto';

@Injectable()
export class FollowUpsService {
  constructor(
    @InjectModel(FollowUp.name)
    private readonly followUpModel: Model<FollowUpDocument>,
  ) {}

  /**
   * Generate Follow Up ID
   * Example: FUP000001
   */
  private async generateFollowUpId(): Promise<string> {
    const latestFollowUp = await this.followUpModel
      .findOne()
      .sort({ createdAt: -1 })
      .select('followUpId');

    if (!latestFollowUp?.followUpId) {
      return 'FUP000001';
    }

    const lastNumber = parseInt(
      latestFollowUp.followUpId.replace('FUP', ''),
      10,
    );

    return `FUP${String(lastNumber + 1).padStart(
      6,
      '0',
    )}`;
  }

  /**
   * Create Follow Up
   */
  async create(
    createFollowUpDto: CreateFollowUpDto,
  ) {
    const followUpId =
      await this.generateFollowUpId();

    // Prevent duplicate follow-up on same Lead,
    // Date and Time
    const exists =
      await this.followUpModel.findOne({
        leadId: createFollowUpDto.leadId,
        followUpDate:
          createFollowUpDto.followUpDate,
        followUpTime:
          createFollowUpDto.followUpTime,
        isDeleted: false,
      });

    if (exists) {
      throw new ConflictException(
        'Follow Up already exists for the selected date and time.',
      );
    }

    const followUp =
      new this.followUpModel({
        ...createFollowUpDto,
        followUpId,
      });

    await followUp.save();

    return {
      success: true,
      message:
        'Follow Up created successfully.',
      data: followUp,
    };
  }

    /**
   * Get All Follow Ups
   */
  async findAll(query: FollowUpQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      assignedTo,
      leadId,
      sortBy = 'followUpDate',
      sortOrder = 'asc',
    } = query;

    const filter: Record<string, any> = {
      isDeleted: false,
    };

    // Search
    if (search) {
      filter.$or = [
        {
          followUpId: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          remarks: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // Filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (leadId) filter.leadId = leadId;

    const skip = (page - 1) * limit;

    const [followUps, total] = await Promise.all([
      this.followUpModel
        .find(filter)
        .populate(
          'leadId',
          'leadId fullName mobile loanAmount'
        )
        .populate(
          'customerId',
          'customerId fullName phone'
        )
        .populate(
          'applicationId',
          'applicationId applicantName loanAmount status'
        )
        .populate(
          'assignedTo',
          'firstName lastName employeeId'
        )
        .populate(
          'createdBy',
          'firstName lastName employeeId'
        )
        .populate(
          'updatedBy',
          'firstName lastName employeeId'
        )
        .sort({
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
        })
        .skip(skip)
        .limit(limit),

      this.followUpModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Follow Ups fetched successfully.',
      data: followUps,
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
   * Get Follow Up By Id
   */
  async findOne(id: string) {
    const followUp = await this.followUpModel
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
        'assignedTo',
        'firstName lastName employeeId',
      )
      .populate(
        'createdBy',
        'firstName lastName employeeId',
      )
      .populate(
        'updatedBy',
        'firstName lastName employeeId',
      );

    if (!followUp) {
      throw new NotFoundException(
        'Follow Up not found.',
      );
    }

    return {
      success: true,
      message: 'Follow Up fetched successfully.',
      data: followUp,
    };
  }

  /**
   * Update Follow Up
   */
  async update(
    id: string,
    updateFollowUpDto: UpdateFollowUpDto,
  ) {
    const followUp =
      await this.followUpModel.findOne({
        _id: id,
        isDeleted: false,
      });

    if (!followUp) {
      throw new NotFoundException(
        'Follow Up not found.',
      );
    }

    // Prevent duplicate follow-up
    if (
      updateFollowUpDto.followUpDate &&
      updateFollowUpDto.followUpTime
    ) {
      const exists =
        await this.followUpModel.findOne({
          _id: { $ne: id },
          leadId:
            updateFollowUpDto.leadId ??
            followUp.leadId,
          followUpDate:
            updateFollowUpDto.followUpDate,
          followUpTime:
            updateFollowUpDto.followUpTime,
          isDeleted: false,
        });

      if (exists) {
        throw new ConflictException(
          'Follow Up already exists for the selected date and time.',
        );
      }
    }

    const updatedFollowUp =
      await this.followUpModel.findByIdAndUpdate(
        id,
        {
          $set: updateFollowUpDto,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    return {
      success: true,
      message:
        'Follow Up updated successfully.',
      data: updatedFollowUp,
    };
  }

  /**
   * Soft Delete Follow Up
   */
  async remove(id: string) {
    const followUp =
      await this.followUpModel.findOne({
        _id: id,
        isDeleted: false,
      });

    if (!followUp) {
      throw new NotFoundException(
        'Follow Up not found.',
      );
    }

    await this.followUpModel.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
      },
    );

    return {
      success: true,
      message:
        'Follow Up deleted successfully.',
    };
  }
    /**
   * Change Follow Up Status
   */
  async changeStatus(
    id: string,
    status: FollowUpStatus,
  ) {
    const followUp = await this.followUpModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!followUp) {
      throw new NotFoundException(
        'Follow Up not found.',
      );
    }

    followUp.status = status;

    await followUp.save();

    return {
      success: true,
      message: 'Follow Up status updated successfully.',
      data: followUp,
    };
  }

  /**
   * Today's Follow Ups
   */
  async getTodayFollowUps() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const data = await this.followUpModel
      .find({
        followUpDate: {
          $gte: start,
          $lte: end,
        },
        isDeleted: false,
      })
      .populate(
        'leadId',
        'leadId fullName mobile',
      )
      .populate(
        'assignedTo',
        'firstName lastName employeeId',
      )
      .sort({
        followUpTime: 1,
      });

    return {
      success: true,
      data,
    };
  }

  /**
   * Upcoming Follow Ups
   */
  async getUpcomingFollowUps() {
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const data = await this.followUpModel
      .find({
        followUpDate: {
          $gt: tomorrow,
        },
        isDeleted: false,
      })
      .populate(
        'leadId',
        'leadId fullName mobile',
      )
      .populate(
        'assignedTo',
        'firstName lastName employeeId',
      )
      .sort({
        followUpDate: 1,
      });

    return {
      success: true,
      data,
    };
  }

  /**
   * Overdue Follow Ups
   */
  async getOverdueFollowUps() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await this.followUpModel
      .find({
        followUpDate: {
          $lt: today,
        },
        status: FollowUpStatus.PENDING,
        isDeleted: false,
      })
      .populate(
        'leadId',
        'leadId fullName mobile',
      )
      .populate(
        'assignedTo',
        'firstName lastName employeeId',
      )
      .sort({
        followUpDate: 1,
      });

    return {
      success: true,
      data,
    };
  }

  /**
   * Dashboard Statistics
   */
  async getDashboardStats() {
    const [
      totalFollowUps,
      pendingFollowUps,
      completedFollowUps,
      missedFollowUps,
      rescheduledFollowUps,
      cancelledFollowUps,
    ] = await Promise.all([
      this.followUpModel.countDocuments({
        isDeleted: false,
      }),

      this.followUpModel.countDocuments({
        status: FollowUpStatus.PENDING,
        isDeleted: false,
      }),

      this.followUpModel.countDocuments({
        status: FollowUpStatus.COMPLETED,
        isDeleted: false,
      }),

      this.followUpModel.countDocuments({
        status: FollowUpStatus.MISSED,
        isDeleted: false,
      }),

      this.followUpModel.countDocuments({
        status: FollowUpStatus.RESCHEDULED,
        isDeleted: false,
      }),

      this.followUpModel.countDocuments({
        status: FollowUpStatus.CANCELLED,
        isDeleted: false,
      }),
    ]);

    return {
      success: true,
      data: {
        totalFollowUps,
        pendingFollowUps,
        completedFollowUps,
        missedFollowUps,
        rescheduledFollowUps,
        cancelledFollowUps,
      },
    };
  }
}
