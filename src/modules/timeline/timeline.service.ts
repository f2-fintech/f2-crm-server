import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Timeline,
  TimelineDocument,
  TimelineType,
} from './schemas/timeline.schemas';

import { TimelineQueryDto } from './dto/timeline-query.dto';

@Injectable()
export class TimelineService {
  constructor(
    @InjectModel(Timeline.name)
    private readonly timelineModel: Model<TimelineDocument>,
  ) {}

  /**
   * Get All Timeline
   */
  async findAll(
    query: TimelineQueryDto,
  ) {
    const {
      page = 1,
      limit = 20,
      entityType,
      action,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const currentPage =
      Number(page) || 1;

    const pageSize =
      Number(limit) || 20;

    const skip =
      (currentPage - 1) * pageSize;

    const filter: Record<
      string,
      any
    > = {
      isDeleted: false,
    };

    if (entityType) {
      filter.entityType =
        entityType;
    }

    if (action) {
      filter.action = action;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte =
          new Date(fromDate);
      }

      if (toDate) {
        filter.createdAt.$lte =
          new Date(toDate);
      }
    }

    const [
      timeline,
      total,
    ] = await Promise.all([
      this.timelineModel
        .find(filter)
        .populate(
          'performedBy',
          'firstName lastName employeeId',
        )
        .sort({
          [sortBy]:
            sortOrder === 'asc'
              ? 1
              : -1,
        })
        .skip(skip)
        .limit(pageSize),

      this.timelineModel.countDocuments(
        filter,
      ),
    ]);

    return {
      success: true,
      message:
        'Timeline fetched successfully.',
      data: timeline,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(
          total / pageSize,
        ),
        hasNext:
          currentPage *
            pageSize <
          total,
        hasPrevious:
          currentPage > 1,
      },
    };
  }
    /**
   * Get Lead Timeline
   */
  async getLeadTimeline(
    leadId: string,
  ) {
    const timeline =
      await this.timelineModel
        .find({
          entityType:
            TimelineType.LEAD,
          entityId: leadId,
          isDeleted: false,
        })
        .populate(
          'performedBy',
          'firstName lastName employeeId',
        )
        .sort({
          createdAt: -1,
        });

    return {
      success: true,
      message:
        'Lead timeline fetched successfully.',
      data: timeline,
    };
  }

  /**
   * Get Customer Timeline
   */
  async getCustomerTimeline(
    customerId: string,
  ) {
    const timeline =
      await this.timelineModel
        .find({
          entityType:
            TimelineType.CUSTOMER,
          entityId: customerId,
          isDeleted: false,
        })
        .populate(
          'performedBy',
          'firstName lastName employeeId',
        )
        .sort({
          createdAt: -1,
        });

    return {
      success: true,
      message:
        'Customer timeline fetched successfully.',
      data: timeline,
    };
  }

  /**
   * Get Application Timeline
   */
  async getApplicationTimeline(
    applicationId: string,
  ) {
    const timeline =
      await this.timelineModel
        .find({
          entityType:
            TimelineType.APPLICATION,
          entityId: applicationId,
          isDeleted: false,
        })
        .populate(
          'performedBy',
          'firstName lastName employeeId',
        )
        .sort({
          createdAt: -1,
        });

    return {
      success: true,
      message:
        'Application timeline fetched successfully.',
      data: timeline,
    };
  }
    /**
   * Dashboard Statistics
   */
  async getDashboardStats() {
    const [
      totalTimeline,
      leadTimeline,
      customerTimeline,
      applicationTimeline,
      todayTimeline,
    ] = await Promise.all([
      this.timelineModel.countDocuments({
        isDeleted: false,
      }),

      this.timelineModel.countDocuments({
        entityType: TimelineType.LEAD,
        isDeleted: false,
      }),

      this.timelineModel.countDocuments({
        entityType: TimelineType.CUSTOMER,
        isDeleted: false,
      }),

      this.timelineModel.countDocuments({
        entityType: TimelineType.APPLICATION,
        isDeleted: false,
      }),

      this.timelineModel.countDocuments({
        createdAt: {
          $gte: new Date(
            new Date().setHours(0, 0, 0, 0),
          ),
          $lte: new Date(
            new Date().setHours(
              23,
              59,
              59,
              999,
            ),
          ),
        },
        isDeleted: false,
      }),
    ]);

    return {
      success: true,
      message:
        'Timeline dashboard fetched successfully.',
      data: {
        totalTimeline,
        leadTimeline,
        customerTimeline,
        applicationTimeline,
        todayTimeline,
      },
    };
  }
}