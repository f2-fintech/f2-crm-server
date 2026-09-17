import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create User
   */
  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return await this.usersService.create(createUserDto);
  }

  /**
   * Get All Users
   */
  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  /**
   * Get User By Id
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return await this.usersService.findOne(id);
  }

  /**
   * Update User
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(
      id,
      updateUserDto,
    );
  }

  /**
   * Delete User
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ) {
    return await this.usersService.remove(id);
  }
}