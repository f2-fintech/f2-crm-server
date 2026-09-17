import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a new team and assign a Manager' })
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Post(':id/members')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER')
  @ApiOperation({ summary: 'Add a user to the team and assign reporting hierarchy' })
  addMember(
    @Param('id') id: string, 
    @Body() addMemberDto: AddMemberDto
  ) {
    return this.teamsService.addMember(id, addMemberDto);
  }

  @Get(':id/hierarchy')
  @ApiOperation({ summary: 'Get the full tree hierarchy of the team' })
  getHierarchy(@Param('id') id: string) {
    return this.teamsService.getHierarchy(id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Get all teams' })
  findAll() {
    return this.teamsService.findAll();
  }
}
