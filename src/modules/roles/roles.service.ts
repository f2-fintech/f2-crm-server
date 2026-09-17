import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role, RoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  /**
   * Create Role
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleModel.findOne({
      name: createRoleDto.name.toUpperCase(),
    });

    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    const role = await this.roleModel.create({
      ...createRoleDto,
      name: createRoleDto.name.toUpperCase(),
    });

    return role;
  }

  /**
   * Get All Roles
   */
  async findAll(): Promise<Role[]> {
    return this.roleModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get Role By Id
   */
  async findOne(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  /**
   * Update Role
   */
  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    const role = await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (updateRoleDto.name) {
      const exists = await this.roleModel.findOne({
        name: updateRoleDto.name.toUpperCase(),
        _id: { $ne: id },
      });

      if (exists) {
        throw new ConflictException('Role already exists');
      }

      updateRoleDto.name = updateRoleDto.name.toUpperCase();
    }

    const updatedRole = await this.roleModel.findByIdAndUpdate(
      id,
      updateRoleDto,
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedRole!;
  }

  /**
   * Delete Role
   */
  async remove(id: string): Promise<{ message: string }> {
    const role = await this.roleModel.findById(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.roleModel.findByIdAndDelete(id);

    return {
      message: 'Role deleted successfully',
    };
  }
}