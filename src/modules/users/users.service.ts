import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { Role, RoleDocument } from '../roles/schemas/role.schema';
import {
  Branch,
  BranchDocument,
} from '../branches/schemas/branch.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,

    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
  ) { }

  /**
   * Create User
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check Email
    const emailExists = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
    });

    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    // Check Phone
    if (createUserDto.phone) {
      const phoneExists = await this.userModel.findOne({
        phone: createUserDto.phone,
      });

      if (phoneExists) {
        throw new ConflictException('Phone already exists');
      }
    }
    // Validate Role
    const role = await this.roleModel.findById(
      createUserDto.roleId,
    );

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (createUserDto.branchId) {
      const branch = await this.branchModel.findById(
        createUserDto.branchId,
      );

      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    // Generate Employee ID
    const employeeId = await this.generateEmployeeId();

    // Hash Password
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    // Derive the base role enum from the role document's name.
    // The Role.name should match one of: SUPER_ADMIN, ADMIN, MANAGER, TEAM_LEADER, EMPLOYEE.
    // We uppercase + underscore-convert common display names so "Team Leader" → "TEAM_LEADER".
    const baseRole = role.name
      .toUpperCase()
      .replace(/\s+/g, '_');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];
    const resolvedRole = allowedRoles.includes(baseRole) ? baseRole : 'EMPLOYEE';

    const createdUser = await this.userModel.create({
      ...createUserDto,
      employeeId,
      role: resolvedRole,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
    });

    const user = await this.userModel
      .findById(createdUser._id)
      .select('-password -refreshToken')
      .populate('roleId')
      .populate('branchId')
      .populate('departmentId');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;

  }

  /**
   * Generate Employee ID
   * Example: EMP000001
   */
  private async generateEmployeeId(): Promise<string> {
    const lastUser = await this.userModel
      .findOne({ employeeId: { $regex: /^EMP\d+$/ } })
      .sort({ createdAt: -1 });

    if (!lastUser || !lastUser.employeeId) {
      return 'EMP000001';
    }

    const lastNumber = Number(
      lastUser.employeeId.replace('EMP', ''),
    );

    if (isNaN(lastNumber)) {
      return 'EMP000001';
    }

    const nextNumber = lastNumber + 1;

    return `EMP${nextNumber
      .toString()
      .padStart(6, '0')}`;
  }

  /**
 * Get All Users
 */
  async findAll(): Promise<User[]> {
    return this.userModel
      .find()
      .select('-password -refreshToken')
      .populate('roleId')
      .populate('branchId')
      .populate('departmentId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get User By Id
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .populate('roleId')
      .populate('branchId')
      .populate('departmentId');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update User
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check Email
    if (updateUserDto.email) {
      const emailExists = await this.userModel.findOne({
        email: updateUserDto.email.toLowerCase(),
        _id: { $ne: id },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }

      updateUserDto.email =
        updateUserDto.email.toLowerCase();
    }

    // Check Phone
    if (updateUserDto.phone) {
      const phoneExists = await this.userModel.findOne({
        phone: updateUserDto.phone,
        _id: { $ne: id },
      });

      if (phoneExists) {
        throw new ConflictException('Phone already exists');
      }
    }

    // Validate Role and derive base role enum
    if (updateUserDto.roleId) {
      const role = await this.roleModel.findById(
        updateUserDto.roleId,
      );

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // Derive the base role enum from the role document's name
      const baseRole = role.name.toUpperCase().replace(/\s+/g, '_');
      const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];
      (updateUserDto as any).role = allowedRoles.includes(baseRole) ? baseRole : 'EMPLOYEE';
    }

    // Validate Branch
    if (updateUserDto.branchId) {
      const branch = await this.branchModel.findById(
        updateUserDto.branchId,
      );

      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    // Hash Password if changed
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        10,
      );
    }

    const updatedUser =
      await this.userModel.findByIdAndUpdate(
        id,
        updateUserDto,
        {
          new: true,
          runValidators: true,
        },
      )
        .select('-password -refreshToken')
        .populate('roleId')
        .populate('branchId')
        .populate('departmentId');

    return updatedUser!;
  }

  /**
 * Delete User
 */
  async remove(
    id: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndDelete(id);

    return {
      message: 'User deleted successfully',
    };
  }
}