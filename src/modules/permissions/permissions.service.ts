import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import {
  Permission,
  PermissionDocument,
} from './schemas/permission.schema';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  /**
   * Create Permission
   */
  async create(
    createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    // Check duplicate key
    const existingKey = await this.permissionModel.findOne({
      key: createPermissionDto.key.toLowerCase(),
    });

    if (existingKey) {
      throw new ConflictException('Permission key already exists');
    }

    // Check duplicate module + action
    const existingPermission = await this.permissionModel.findOne({
      module: createPermissionDto.module,
      action: createPermissionDto.action,
    });

    if (existingPermission) {
      throw new ConflictException(
        'Permission already exists for this module and action',
      );
    }

    const permission = await this.permissionModel.create({
      ...createPermissionDto,
      key: createPermissionDto.key.toLowerCase(),
    });

    return permission;
  }

  /**
   * Get All Permissions
   */
  async findAll(): Promise<Permission[]> {
    return this.permissionModel
      .find()
      .sort({ module: 1, action: 1 })
      .exec();
  }

  /**
   * Get Permission By Id
   */
  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionModel.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  /**
   * Update Permission
   */
  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.permissionModel.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Check duplicate key
    if (updatePermissionDto.key) {
      const exists = await this.permissionModel.findOne({
        key: updatePermissionDto.key.toLowerCase(),
        _id: { $ne: id },
      });

      if (exists) {
        throw new ConflictException('Permission key already exists');
      }

      updatePermissionDto.key =
        updatePermissionDto.key.toLowerCase();
    }

    const updatedPermission =
      await this.permissionModel.findByIdAndUpdate(
        id,
        updatePermissionDto,
        {
          new: true,
          runValidators: true,
        },
      );

    return updatedPermission!;
  }

  /**
   * Delete Permission
   */
  async remove(id: string): Promise<{ message: string }> {
    const permission = await this.permissionModel.findById(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permissionModel.findByIdAndDelete(id);

    return {
      message: 'Permission deleted successfully',
    };
  }
}