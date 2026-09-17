import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch, BranchDocument } from './schemas/branch.schema';

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) {}

  /**
   * Create Branch
   */
  async create(
    createBranchDto: CreateBranchDto,
  ): Promise<Branch> {
    // Check duplicate Branch Code
    const existingCode = await this.branchModel.findOne({
      branchCode: createBranchDto.branchCode.toUpperCase(),
    });

    if (existingCode) {
      throw new ConflictException('Branch code already exists');
    }

    // Check duplicate Branch Name
    const existingName = await this.branchModel.findOne({
      branchName: createBranchDto.branchName,
    });

    if (existingName) {
      throw new ConflictException('Branch name already exists');
    }

    const branch = await this.branchModel.create({
      ...createBranchDto,
      branchCode: createBranchDto.branchCode.toUpperCase(),
    });

    return branch;
  }

  /**
   * Get All Branches
   */
  async findAll(): Promise<Branch[]> {
    return this.branchModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get Branch By Id
   */
  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchModel.findById(id);

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  /**
   * Update Branch
   */
  async update(
    id: string,
    updateBranchDto: UpdateBranchDto,
  ): Promise<Branch> {
    const branch = await this.branchModel.findById(id);

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    // Duplicate Branch Code Check
    if (updateBranchDto.branchCode) {
      const existingCode = await this.branchModel.findOne({
        branchCode: updateBranchDto.branchCode.toUpperCase(),
        _id: { $ne: id },
      });

      if (existingCode) {
        throw new ConflictException('Branch code already exists');
      }

      updateBranchDto.branchCode =
        updateBranchDto.branchCode.toUpperCase();
    }

    // Duplicate Branch Name Check
    if (updateBranchDto.branchName) {
      const existingName = await this.branchModel.findOne({
        branchName: updateBranchDto.branchName,
        _id: { $ne: id },
      });

      if (existingName) {
        throw new ConflictException('Branch name already exists');
      }
    }

    const updatedBranch = await this.branchModel.findByIdAndUpdate(
      id,
      updateBranchDto,
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedBranch!;
  }

  /**
   * Delete Branch
   */
  async remove(
    id: string,
  ): Promise<{ message: string }> {
    const branch = await this.branchModel.findById(id);

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    await this.branchModel.findByIdAndDelete(id);

    return {
      message: 'Branch deleted successfully',
    };
  }
}