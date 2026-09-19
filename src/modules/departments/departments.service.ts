import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import {
  Department,
  DepartmentDocument,
} from './schemas/department.schema';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
  ) { }

  /**
   * Create Department
   */
  async create(
    createDepartmentDto: CreateDepartmentDto,
  ): Promise<Department> {
    // Check Department Code
    const existingCode = await this.departmentModel.findOne({
      departmentCode: createDepartmentDto.departmentCode.toUpperCase(),
    });

    if (existingCode) {
      throw new ConflictException(
        'Department code already exists',
      );
    }

    // Check Department Name
    const existingName = await this.departmentModel.findOne({
      departmentName: createDepartmentDto.departmentName,
    });

    if (existingName) {
      throw new ConflictException(
        'Department name already exists',
      );
    }

    const department = await this.departmentModel.create({
      ...createDepartmentDto,
      departmentCode:
        createDepartmentDto.departmentCode.toUpperCase(),
    });

    return department;
  }

  /**
   * Get All Departments
   */
  async findAll(): Promise<Department[]> {
    return this.departmentModel
      .find()
      .populate('headOfDepartment', 'firstName lastName email profileImage')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get Department By Id
   */
  async findOne(id: string): Promise<Department> {
    const department =
      await this.departmentModel.findById(id).populate('headOfDepartment', 'firstName lastName email profileImage');

    if (!department) {
      throw new NotFoundException(
        'Department not found',
      );
    }

    return department;
  }

  /**
   * Update Department
   */
  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department =
      await this.departmentModel.findById(id);

    if (!department) {
      throw new NotFoundException(
        'Department not found',
      );
    }

    // Check Department Code
    if (updateDepartmentDto.departmentCode) {
      const existingCode =
        await this.departmentModel.findOne({
          departmentCode:
            updateDepartmentDto.departmentCode.toUpperCase(),
          _id: { $ne: id },
        });

      if (existingCode) {
        throw new ConflictException(
          'Department code already exists',
        );
      }

      updateDepartmentDto.departmentCode =
        updateDepartmentDto.departmentCode.toUpperCase();
    }

    // Check Department Name
    if (updateDepartmentDto.departmentName) {
      const existingName =
        await this.departmentModel.findOne({
          departmentName:
            updateDepartmentDto.departmentName,
          _id: { $ne: id },
        });

      if (existingName) {
        throw new ConflictException(
          'Department name already exists',
        );
      }
    }

    const updatedDepartment =
      await this.departmentModel.findByIdAndUpdate(
        id,
        updateDepartmentDto,
        {
          new: true,
          runValidators: true,
        },
      ).populate('headOfDepartment', 'firstName lastName email profileImage');

    return updatedDepartment!;
  }

  /**
   * Delete Department
   */
  async remove(
    id: string,
  ): Promise<{ message: string }> {
    const department =
      await this.departmentModel.findById(id);

    if (!department) {
      throw new NotFoundException(
        'Department not found',
      );
    }

    await this.departmentModel.findByIdAndDelete(id);

    return {
      message: 'Department deleted successfully',
    };
  }
}