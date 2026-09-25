import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { Team, TeamDocument } from './schemas/team.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createTeamDto: CreateTeamDto) {
    // Verify manager exists and has MANAGER role
    const manager = await this.userModel.findById(createTeamDto.managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }
    if (manager.role !== 'MANAGER' && manager.role !== 'SUPER_ADMIN' && manager.role !== 'ADMIN') {
      throw new BadRequestException('Assigned user must be a Manager or Admin');
    }

    const team = await this.teamModel.create({
      ...createTeamDto,
      members: [manager._id]
    });
    
    // Assign manager to this team
    manager.teamId = team._id as Types.ObjectId;
    await manager.save();

    return team;
  }

  async addMember(teamId: string, addMemberDto: AddMemberDto) {
    const team = await this.teamModel.findById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const user = await this.userModel.findById(addMemberDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updateData: any = { teamId: new Types.ObjectId(teamId) };

    if (addMemberDto.reportsTo) {
      const reportsToUser = await this.userModel.findById(addMemberDto.reportsTo);
      if (!reportsToUser) {
        throw new NotFoundException('Reporting manager not found');
      }
      if (reportsToUser.teamId?.toString() !== teamId && team.managerId.toString() !== addMemberDto.reportsTo) {
         throw new BadRequestException('Reporting manager must belong to the same team');
      }
      updateData.reportsTo = new Types.ObjectId(addMemberDto.reportsTo);
    } else {
      updateData.reportsTo = new Types.ObjectId(team.managerId as any);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(user._id, updateData, { new: true });

    if (updatedUser) {
      // Ensure member is visible inside the team document directly
      await this.teamModel.findByIdAndUpdate(teamId, {
        $addToSet: { members: updatedUser._id }
      });
    }

    return { message: 'Member added to team successfully', user: updatedUser };
  }

  async syncMembers(teamId: string, syncDto: any) {
    const { managerId, teamLeaderIds = [], managerMemberIds = [], tlMembers = {} } = syncDto;
    
    // 1. Unassign everyone currently in the team
    await this.userModel.updateMany(
      { teamId: new Types.ObjectId(teamId) },
      { $unset: { teamId: 1, reportsTo: 1 } }
    );
    
    // 2. Clear members array in team
    await this.teamModel.findByIdAndUpdate(teamId, { members: [] });

    // 3. Assign new Manager
    const manager = await this.userModel.findById(managerId);
    if(manager) {
       manager.teamId = new Types.ObjectId(teamId);
       manager.reportsTo = null as any;
       await manager.save();
       await this.teamModel.findByIdAndUpdate(teamId, { $push: { members: manager._id } });
    }

    // 4. Assign new Team Leaders
    for (const tlId of teamLeaderIds) {
      await this.addMember(teamId, { userId: tlId, reportsTo: managerId });
    }

    // 5. Assign Members
    for (const userId of managerMemberIds) {
      await this.addMember(teamId, { userId, reportsTo: managerId });
    }
    
    // 6. Assign Team Leader Members
    for (const [tlId, memberIds] of Object.entries(tlMembers)) {
      if (Array.isArray(memberIds)) {
        for (const userId of memberIds) {
          await this.addMember(teamId, { userId: userId as string, reportsTo: tlId });
        }
      }
    }

    return { message: 'Team members synced successfully' };
  }

  async getHierarchy(teamId: string) {
    const team = await this.teamModel.findById(teamId).lean();
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get all users in this team (explicitly cast to ObjectId to ensure match)
    const users = await this.userModel.find({ teamId: new Types.ObjectId(teamId) }).lean();
    
    // Build tree function
    const buildTree = (managerId: string) => {
      const directReports = users.filter(
        (u) => u.reportsTo?.toString() === managerId
      );
      
      return directReports.map((report) => ({
        id: report._id,
        name: `${report.firstName} ${report.lastName}`,
        role: report.role,
        directReports: buildTree(report._id.toString()),
      }));
    };

    const manager = await this.userModel.findById(team.managerId).lean();
    
    return {
      teamName: team.name,
      teamId: team._id,
      manager: manager ? {
        id: manager._id,
        name: `${manager.firstName} ${manager.lastName}`,
        role: manager.role,
        directReports: buildTree(manager._id.toString()),
      } : null
    };
  }

  async update(id: string, updateTeamDto: any) {
    const team = await this.teamModel.findByIdAndUpdate(
      id,
      updateTeamDto,
      { new: true, runValidators: true }
    );
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async remove(id: string) {
    const team = await this.teamModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return { message: 'Team successfully deleted (deactivated)' };
  }

  async findAll() {
    return this.teamModel.find({ isActive: true }).populate('managerId', 'firstName lastName email role');
  }
}
