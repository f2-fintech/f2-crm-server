import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Application,
  ApplicationDocument,
  ApplicationStatus,
} from './schemas/application.schema';

import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { LifecycleEventsService } from '../lifecycle-events/lifecycle-events.service';
import {
  LifecycleEventType,
  LifecycleEventSource,
} from '../lifecycle-events/enums/lifecycle.enum';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    private readonly lifecycleEventsService: LifecycleEventsService,
  ) {}

  /**
   * Generate Application ID
   * Example: APP000001
   */
  private async generateApplicationId(): Promise<string> {
    const latestApplication = await this.applicationModel
      .findOne()
      .sort({ createdAt: -1 })
      .select('applicationId');

    if (!latestApplication?.applicationId) {
      return 'APP000001';
    }

    const lastNumber = parseInt(
      latestApplication.applicationId.replace('APP', ''),
      10,
    );

    return `APP${String(lastNumber + 1).padStart(6, '0')}`;
  }

  /**
   * Create Application
   */
  async create(createApplicationDto: CreateApplicationDto) {
    const applicationId = await this.generateApplicationId();

    // Prevent duplicate application against same Lead
    if (createApplicationDto.leadId) {
      const leadExists = await this.applicationModel.findOne({
        leadId: createApplicationDto.leadId,
        isDeleted: false,
      });

      if (leadExists) {
        throw new ConflictException(
          'Application already exists for this lead.',
        );
      }
    }

    const application = new this.applicationModel({
      ...createApplicationDto,
      applicationId,
    });

    await application.save();

    await this.lifecycleEventsService.transitionStage({
      entityType: 'Application',
      entityId: application._id.toString(),
      applicationId: application._id.toString(),
      leadId: application.leadId,
      customerId: application.customerId,
      eventType: LifecycleEventType.APPLICATION_CREATED,
      toStage: ApplicationStatus.DRAFT, // based on schema default
      source: LifecycleEventSource.CRM,
    });

    return {
      success: true,
      message: 'Application created successfully.',
      data: application,
    };
  }

  /**
   * Get All Applications
   */
  async findAll(query: ApplicationQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      loanType,
      lenderName,
      customerId,
      leadId,
      assignedTo,
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
          applicantName: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          phone: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          email: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          applicationId: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // Filters
    if (status) filter.status = status;
    if (loanType) filter.loanType = loanType;
    if (lenderName) filter.lenderName = lenderName;
    if (customerId) filter.customerId = customerId;
    if (leadId) filter.leadId = leadId;
    if (assignedTo) filter.assignedTo = assignedTo;

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.applicationModel
        .find(filter)
        .populate('assignedTo', 'firstName lastName employeeId')
        .populate('createdBy', 'firstName lastName employeeId')
        .populate('updatedBy', 'firstName lastName employeeId')
        .sort({
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
        })
        .skip(skip)
        .limit(limit),

      this.applicationModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Applications fetched successfully.',
      data: applications,

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
   * Get Application By Id
   */
  async findOne(id: string) {
    const application = await this.applicationModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .populate('assignedTo', 'firstName lastName employeeId')
      .populate('createdBy', 'firstName lastName employeeId')
      .populate('updatedBy', 'firstName lastName employeeId');

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    return {
      success: true,
      message: 'Application fetched successfully.',
      data: application,
    };
  }

  /**
   * Update Application
   */
  async update(id: string, updateApplicationDto: UpdateApplicationDto) {
    const application = await this.applicationModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    // Prevent duplicate Lead mapping
    if (
      updateApplicationDto.leadId &&
      updateApplicationDto.leadId !== application.leadId
    ) {
      const exists = await this.applicationModel.findOne({
        leadId: updateApplicationDto.leadId,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (exists) {
        throw new ConflictException(
          'Application already exists for this lead.',
        );
      }
    }

    const updatedApplication = await this.applicationModel.findByIdAndUpdate(
      id,
      {
        $set: updateApplicationDto,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    const payload = updateApplicationDto as any;
    if (payload.status && payload.status !== application.status) {
      await this.lifecycleEventsService.transitionStage({
        entityType: 'Application',
        entityId: application._id.toString(),
        applicationId: application._id.toString(),
        leadId: application.leadId,
        customerId: application.customerId,
        eventType: LifecycleEventType.APPLICATION_STAGE_CHANGED, // Or map to specific if needed
        fromStage: application.status,
        toStage: payload.status,
        source: LifecycleEventSource.CRM,
      });
    }

    return {
      success: true,
      message: 'Application updated successfully.',
      data: updatedApplication,
    };
  }

  /**
   * Soft Delete Application
   */
  async remove(id: string) {
    const application = await this.applicationModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    await this.applicationModel.findByIdAndUpdate(id, {
      isDeleted: true,
    });

    return {
      success: true,
      message: 'Application deleted successfully.',
    };
  }

  /**
   * Change Application Status
   */
  async changeStatus(id: string, status: ApplicationStatus) {
    const application = await this.applicationModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const oldStatus = application.status;
    application.status = status;
    await application.save();

    await this.lifecycleEventsService.transitionStage({
      entityType: 'Application',
      entityId: application._id.toString(),
      applicationId: application._id.toString(),
      leadId: application.leadId,
      customerId: application.customerId,
      eventType: LifecycleEventType.APPLICATION_STAGE_CHANGED,
      fromStage: oldStatus,
      toStage: status,
      source: LifecycleEventSource.CRM,
    });

    return {
      success: true,
      message: 'Application status updated successfully.',
      data: application,
    };
  }

  /**
   * Assign Application
   */
  async assignApplication(id: string, assignedTo: string) {
    const application = await this.applicationModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    application.assignedTo = assignedTo as any;

    await application.save();

    return {
      success: true,
      message: 'Application assigned successfully.',
      data: application,
    };
  }

  /**
   * Dashboard Statistics
   */
  async getDashboardStats() {
    const [
      totalApplications,
      draftApplications,
      submittedApplications,
      underReviewApplications,
      approvedApplications,
      rejectedApplications,
      disbursedApplications,
    ] = await Promise.all([
      this.applicationModel.countDocuments({
        isDeleted: false,
      }),

      this.applicationModel.countDocuments({
        status: ApplicationStatus.DRAFT,
        isDeleted: false,
      }),

      this.applicationModel.countDocuments({
        status: ApplicationStatus.SUBMITTED,
        isDeleted: false,
      }),

      this.applicationModel.countDocuments({
        status: ApplicationStatus.UNDER_REVIEW,
        isDeleted: false,
      }),

      this.applicationModel.countDocuments({
        status: ApplicationStatus.APPROVED,
        isDeleted: false,
      }),

      this.applicationModel.countDocuments({
        status: ApplicationStatus.REJECTED,
        isDeleted: false,
      }),

      this.applicationModel.countDocuments({
        status: ApplicationStatus.DISBURSED,
        isDeleted: false,
      }),
    ]);

    return {
      success: true,
      data: {
        totalApplications,
        draftApplications,
        submittedApplications,
        underReviewApplications,
        approvedApplications,
        rejectedApplications,
        disbursedApplications,
      },
    };
  }

  /**
   * Sync Applications from OMS
   */
  async syncOmsApplications() {
    const OMS_BASE_URL = process.env.OMS_BASE_URL || 'https://admin.f2fintech.in';
    const OMS_COMPANY_ID = process.env.OMS_COMPANY_ID || '101';
    
    try {
      const response = await fetch(`${OMS_BASE_URL}/api/v1/get-customer-loan-applications?companyId=${OMS_COMPANY_ID}`, {
        headers: { 'companyid': OMS_COMPANY_ID }
      });

      if (!response.ok) {
        throw new Error(`OMS API returned ${response.status}`);
      }

      const payload = await response.json();
      const results = payload?.data?.results || [];

      let updated = 0;
      let skipped = 0;

      for (const item of results) {
        const omsApplicationId = String(item.applicationId);
        const application = await this.applicationModel.findOne({ omsId: omsApplicationId });
        
        if (application) {
          const statusLower = (item.loanStatus || '').toLowerCase();
          let mappedStatus = ApplicationStatus.DRAFT;
          if (statusLower === 'submitted') mappedStatus = ApplicationStatus.SUBMITTED;
          else if (statusLower === 'approved') mappedStatus = ApplicationStatus.APPROVED;
          else if (statusLower === 'rejected') mappedStatus = ApplicationStatus.REJECTED;
          else if (statusLower === 'disbursed') mappedStatus = ApplicationStatus.DISBURSED;
          else if (statusLower === 'under_review' || statusLower === 'pending') mappedStatus = ApplicationStatus.UNDER_REVIEW;

          if (application.status !== mappedStatus) {
            const oldStatus = application.status;
            application.status = mappedStatus;
            await application.save();

            await this.lifecycleEventsService.transitionStage({
              entityType: 'Application',
              entityId: application._id.toString(),
              applicationId: application._id.toString(),
              leadId: application.leadId,
              customerId: application.customerId,
              eventType: LifecycleEventType.APPLICATION_STAGE_CHANGED,
              fromStage: oldStatus,
              toStage: mappedStatus,
              source: LifecycleEventSource.OMS, // Using OMS source
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          // If application doesn't exist, we don't automatically create one to avoid duplicate messy data,
          // as per "If an OMS ID already exists in CRM, use it. Do not create duplicate customers/applications."
          // But wait, if it doesn't exist, we might want to create it?
          // For this lightweight requirement, we just sync existing linked applications.
          skipped++;
        }
      }

      return { success: true, updated, skipped };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
