import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
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
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create User
   */
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post()
  async create(
    @Body() createUserDto: CreateUserDto,
  ) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(@Query() query: any) {
    return await this.usersService.findAll(query);
  }

  /**
   * Get User By Id
   */
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return await this.usersService.findOne(id);
  }

  /**
   * Update User
   */
  @Roles('SUPER_ADMIN', 'ADMIN')
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
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
  ) {
    return await this.usersService.remove(id);
  }
}