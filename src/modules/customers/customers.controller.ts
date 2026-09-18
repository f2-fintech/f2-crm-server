import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Post()
  @ApiOperation({ summary: 'Create Customer' })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
  })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get All Customers',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers fetched successfully',
  })
  findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Customer By Id',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer fetched successfully',
  })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update Customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Get('dashboard/stats')
  getDashboardStats() {
    return this.customersService.getDashboardStats();
  }

  @Get('lead/:leadId')
  getCustomerByLeadId(
    @Param('leadId') leadId: string,
  ) {
    return this.customersService.getCustomerByLeadId(
      leadId,
    );
  }

  @Get('application/:applicationId')
  getCustomerByApplicationId(
    @Param('applicationId') applicationId: string,
  ) {
    return this.customersService.getCustomerByApplicationId(
      applicationId,
    );
  }

  @Patch(':id/restore')
  restoreCustomer(@Param('id') id: string) {
    return this.customersService.restoreCustomer(id);
  }

  @Delete(':id/permanent')
  permanentDelete(@Param('id') id: string) {
    return this.customersService.permanentDelete(id);
  }

}