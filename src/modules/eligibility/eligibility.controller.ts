import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { CreateEligibilityDto } from './dto/create-eligibility.dto';
import { UpdateEligibilityDto } from './dto/update-eligibility.dto';

@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Post()
  create(@Body() createEligibilityDto: CreateEligibilityDto) {
    return this.eligibilityService.create(createEligibilityDto);
  }

  @Get()
  findAll() {
    return this.eligibilityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eligibilityService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEligibilityDto: UpdateEligibilityDto) {
    return this.eligibilityService.update(+id, updateEligibilityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eligibilityService.remove(+id);
  }
}
