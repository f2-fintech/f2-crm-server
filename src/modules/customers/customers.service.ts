import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Customer, CustomerStatus, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) { }

  /**
   * Generate Customer ID
   * Example:
   * CUS000001
   */
  private async generateCustomerId(): Promise<string> {
    const latestCustomer = await this.customerModel
      .findOne()
      .sort({ createdAt: -1 })
      .select('customerId');

    if (!latestCustomer?.customerId) {
      return 'CUS000001';
    }

    const lastNumber = parseInt(
      latestCustomer.customerId.replace('CUS', ''),
      10,
    );

    return `CUS${String(lastNumber + 1).padStart(6, '0')}`;
  }

  /**
   * Create Customer
   */
  async create(createCustomerDto: CreateCustomerDto) {
    const phoneExists = await this.customerModel.findOne({
      phone: createCustomerDto.phone,
      isDeleted: false,
    });

    if (phoneExists) {
      throw new ConflictException(
        'Customer already exists with this phone number.',
      );
    }

    if (createCustomerDto.email) {
      const emailExists = await this.customerModel.findOne({
        email: createCustomerDto.email,
        isDeleted: false,
      });

      if (emailExists) {
        throw new ConflictException(
          'Customer already exists with this email.',
        );
      }
    }

    const customerId = await this.generateCustomerId();

    const customer = new this.customerModel({
      ...createCustomerDto,
      customerId,
    });

    await customer.save();

    return {
      success: true,
      message: 'Customer created successfully.',
      data: customer,
    };
  }


  /**
   * Get All Customers
   */
  async findAll(query: CustomerQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      city,
      state,
      loanType,
      employmentType,
      branchId,
      relationshipManager,
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
          fullName: {
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
          customerId: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    // Filters
    if (status) filter.status = status;
    if (city) filter.city = city;
    if (state) filter.state = state;
    if (loanType) filter.loanType = loanType;
    if (employmentType) filter.employmentType = employmentType;
    if (branchId) filter.branchId = branchId;
    if (relationshipManager)
      filter.relationshipManager = relationshipManager;

    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .populate('branchId', 'branchName branchCode')
        .populate(
          'relationshipManager',
          'firstName lastName employeeId',
        )
        .populate(
          'createdBy',
          'firstName lastName employeeId',
        )
        .sort({
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
        })
        .skip(skip)
        .limit(limit),

      this.customerModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Customers fetched successfully.',
      data: customers,

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
   * Get Customer By Id
   */
  async findOne(id: string) {
    const customer = await this.customerModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .populate('branchId', 'branchName branchCode')
      .populate(
        'relationshipManager',
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

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return {
      success: true,
      message: 'Customer fetched successfully.',
      data: customer,
    };
  }

  /**
   * Update Customer
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.customerModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    // Check Duplicate Phone
    if (
      updateCustomerDto.phone &&
      updateCustomerDto.phone !== customer.phone
    ) {
      const phoneExists = await this.customerModel.findOne({
        phone: updateCustomerDto.phone,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (phoneExists) {
        throw new ConflictException(
          'Customer already exists with this phone number.',
        );
      }
    }

    // Check Duplicate Email
    if (
      updateCustomerDto.email &&
      updateCustomerDto.email !== customer.email
    ) {
      const emailExists = await this.customerModel.findOne({
        email: updateCustomerDto.email,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (emailExists) {
        throw new ConflictException(
          'Customer already exists with this email.',
        );
      }
    }

    const updatedCustomer =
      await this.customerModel.findByIdAndUpdate(
        id,
        {
          $set: updateCustomerDto,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    return {
      success: true,
      message: 'Customer updated successfully.',
      data: updatedCustomer,
    };
  }

  /**
   * Soft Delete Customer
   */
  async remove(id: string) {
    const customer = await this.customerModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    await this.customerModel.findByIdAndUpdate(id, {
      isDeleted: true,
    });

    return {
      success: true,
      message: 'Customer deleted successfully.',
    };
  }

  /**
   * Customer Dashboard Statistics
   */
  async getDashboardStats() {
    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      closedCustomers,
    ] = await Promise.all([
      this.customerModel.countDocuments({
        isDeleted: false,
      }),

      this.customerModel.countDocuments({
        status: CustomerStatus.ACTIVE,
        isDeleted: false,
      }),

      this.customerModel.countDocuments({
        status: CustomerStatus.INACTIVE,
        isDeleted: false,
      }),

      this.customerModel.countDocuments({
        status: CustomerStatus.CLOSED,
        isDeleted: false,
      }),
    ]);

    return {
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        closedCustomers,
      },
    };
  }

  /**
   * Get Customer By Lead Id
   */
  async getCustomerByLeadId(leadId: string) {
    const customer = await this.customerModel.findOne({
      leadId,
      isDeleted: false,
    });

    if (!customer) {
      throw new NotFoundException(
        'Customer not found.',
      );
    }

    return {
      success: true,
      data: customer,
    };
  }

  /**
   * Get Customer By Application Id
   */
  async getCustomerByApplicationId(
    applicationId: string,
  ) {
    const customer = await this.customerModel.findOne({
      applicationId,
      isDeleted: false,
    });

    if (!customer) {
      throw new NotFoundException(
        'Customer not found.',
      );
    }

    return {
      success: true,
      data: customer,
    };
  }

  /**
   * Restore Deleted Customer
   */
  async restoreCustomer(id: string) {
    const customer = await this.customerModel.findById(id);

    if (!customer) {
      throw new NotFoundException(
        'Customer not found.',
      );
    }

    customer.isDeleted = false;

    await customer.save();

    return {
      success: true,
      message: 'Customer restored successfully.',
      data: customer,
    };
  }

  /**
   * Permanently Delete Customer
   */
  async permanentDelete(id: string) {
    const customer = await this.customerModel.findById(id);

    if (!customer) {
      throw new NotFoundException(
        'Customer not found.',
      );
    }

    await this.customerModel.findByIdAndDelete(id);

    return {
      success: true,
      message: 'Customer permanently deleted.',
    };
  }
}