import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Activity,
  ActivityDocument,
  ActivityStatus,
  ActivityType,
} from './schema/activity.schema';

import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,
  ) {}

  /**
   * Generate Activity ID
   * Example: ACT000001
   */
  private async generateActivityId(): Promise<string> {
    const latestActivity = await this.activityModel
      .findOne()
      .sort({ createdAt: -1 })
      .select('activityId');

    if (!latestActivity?.activityId) {
      return 'ACT000001';
    }

    const lastNumber = parseInt(
      latestActivity.activityId.replace('ACT', ''),
      10,
    );

    return `ACT${String(lastNumber + 1).padStart(
      6,
      '0',
    )}`;
  }

  /**
   * Create Activity
   */
  async create(
    createActivityDto: CreateActivityDto,
  ) {
    const activityId = await this.generateActivityId();

    const exists = await this.activityModel.findOne({
      leadId: createActivityDto.leadId,
      activityDate: createActivityDto.activityDate,
      activityTime: createActivityDto.activityTime,
      activityType: createActivityDto.activityType,
      isDeleted: false,
    });

    if (exists) {
      throw new ConflictException(
        'Activity already exists for the selected date and time.',
      );
    }

    const activity = new this.activityModel({
      ...createActivityDto,
      activityId,
    });

    await activity.save();

    return {
      success: true,
      message: 'Activity created successfully.',
      data: activity,
    };
  }
  /**
 * Get All Activities
 */
async findAll(query: ActivityQueryDto) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    activityType,
    assignedTo,
    leadId,
    sortBy = 'activityDate',
    sortOrder = 'asc',
  } = query;

  const filter: Record<string, any> = {
    isDeleted: false,
  };

  // Search
  if (search) {
    filter.$or = [
      {
        activityId: {
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
        description: {
          $regex: search,
          $options: 'i',
        },
      },
    ];
  }

  // Filters
  if (status) filter.status = status;
  if (activityType) filter.activityType = activityType;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (leadId) filter.leadId = leadId;

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    this.activityModel
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
      )
      .sort({
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      })
      .skip(skip)
      .limit(limit),

    this.activityModel.countDocuments(filter),
  ]);

  return {
    success: true,
    message: 'Activities fetched successfully.',
    data: activities,
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
 * Get Activity By Id
 */
async findOne(id: string) {
  const activity = await this.activityModel
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

  if (!activity) {
    throw new NotFoundException(
      'Activity not found.',
    );
  }

  return {
    success: true,
    message: 'Activity fetched successfully.',
    data: activity,
  };
}
/**
 * Update Activity
 */
async update(
  id: string,
  updateActivityDto: UpdateActivityDto,
) {
  const activity = await this.activityModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!activity) {
    throw new NotFoundException(
      'Activity not found.',
    );
  }

  // Prevent duplicate activity
  if (
    updateActivityDto.activityDate &&
    updateActivityDto.activityTime
  ) {
    const exists =
      await this.activityModel.findOne({
        _id: { $ne: id },
        leadId:
          updateActivityDto.leadId ??
          activity.leadId,
        activityDate:
          updateActivityDto.activityDate,
        activityTime:
          updateActivityDto.activityTime,
        activityType:
          updateActivityDto.activityType ??
          activity.activityType,
        isDeleted: false,
      });

    if (exists) {
      throw new ConflictException(
        'Activity already exists for the selected date and time.',
      );
    }
  }

  const updatedActivity =
    await this.activityModel.findByIdAndUpdate(
      id,
      {
        $set: updateActivityDto,
      },
      {
        new: true,
        runValidators: true,
      },
    );

  return {
    success: true,
    message:
      'Activity updated successfully.',
    data: updatedActivity,
  };
}
/**
 * Soft Delete Activity
 */
async remove(id: string) {
  const activity = await this.activityModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!activity) {
    throw new NotFoundException(
      'Activity not found.',
    );
  }

  await this.activityModel.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
  );

  return {
    success: true,
    message:
      'Activity deleted successfully.',
  };
}
/**
 * Change Activity Status
 */
async changeStatus(
  id: string,
  status: ActivityStatus,
) {
  const activity = await this.activityModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!activity) {
    throw new NotFoundException(
      'Activity not found.',
    );
  }

  activity.status = status;

  await activity.save();

  return {
    success: true,
    message:
      'Activity status updated successfully.',
    data: activity,
  };
}
/**
 * Today's Activities
 */
async getTodayActivities() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const data = await this.activityModel
    .find({
      activityDate: {
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
      activityTime: 1,
    });

  return {
    success: true,
    data,
  };
}
/**
 * Upcoming Activities
 */
async getUpcomingActivities() {
  const tomorrow = new Date();
  tomorrow.setHours(23, 59, 59, 999);

  const data = await this.activityModel
    .find({
      activityDate: {
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
      activityDate: 1,
    });

  return {
    success: true,
    data,
  };
}
/**
 * Lead Activities
 */
async getLeadActivities(leadId: string) {
  const data = await this.activityModel
    .find({
      leadId,
      isDeleted: false,
    })
    .populate(
      'assignedTo',
      'firstName lastName employeeId',
    )
    .populate(
      'createdBy',
      'firstName lastName employeeId',
    )
    .sort({
      activityDate: -1,
      createdAt: -1,
    });

  return {
    success: true,
    message: 'Lead activities fetched successfully.',
    data,
  };
}
/**
 * Dashboard Statistics
 */
async getDashboardStats() {
  const [
    totalActivities,
    pendingActivities,
    completedActivities,
    cancelledActivities,
    totalCalls,
    totalMeetings,
    totalEmails,
  ] = await Promise.all([
    this.activityModel.countDocuments({
      isDeleted: false,
    }),

    this.activityModel.countDocuments({
      status: ActivityStatus.PENDING,
      isDeleted: false,
    }),

    this.activityModel.countDocuments({
      status: ActivityStatus.COMPLETED,
      isDeleted: false,
    }),

    this.activityModel.countDocuments({
      status: ActivityStatus.CANCELLED,
      isDeleted: false,
    }),

    this.activityModel.countDocuments({
      activityType: ActivityType.CALL,
      isDeleted: false,
    }),

    this.activityModel.countDocuments({
      activityType: ActivityType.MEETING,
      isDeleted: false,
    }),

    this.activityModel.countDocuments({
      activityType: ActivityType.EMAIL,
      isDeleted: false,
    }),
  ]);

  return {
    success: true,
    data: {
      totalActivities,
      pendingActivities,
      completedActivities,
      cancelledActivities,
      totalCalls,
      totalMeetings,
      totalEmails,
    },
  };
}

}