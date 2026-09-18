import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create Team' })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
  })
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Teams' })
  @ApiResponse({
    status: 200,
    description: 'Teams fetched successfully',
  })
  findAll() {
    return this.teamsService.findAll();
  }

  @Get('hierarchy/:id')
  @ApiOperation({
    summary: 'Get Team Hierarchy',
  })
  getHierarchy(@Param('id') id: string) {
    return this.teamsService.getHierarchy(id);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto) {
    return this.teamsService.addMember(id, addMemberDto);
  }

  @Post(':id/members/sync')
  syncMembers(
    @Param('id') id: string,
    @Body()
    syncDto: {
      managerId: string;
      teamLeaderId?: string;
      managerMemberIds: string[];
      teamLeaderMemberIds: string[];
    },
  ) {
    return this.teamsService.syncMembers(id, syncDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
