import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
    if (
      manager.role !== 'MANAGER' &&
      manager.role !== 'SUPER_ADMIN' &&
      manager.role !== 'ADMIN'
    ) {
      throw new BadRequestException('Assigned user must be a Manager or Admin');
    }

    const team = await this.teamModel.create({
      ...createTeamDto,
      members: [manager._id],
    });

    // Assign manager to this team
    manager.teamId = team._id;
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
      const reportsToUser = await this.userModel.findById(
        addMemberDto.reportsTo,
      );
      if (!reportsToUser) {
        throw new NotFoundException('Reporting manager not found');
      }
      if (
        reportsToUser.teamId?.toString() !== teamId &&
        team.managerId.toString() !== addMemberDto.reportsTo
      ) {
        throw new BadRequestException(
          'Reporting manager must belong to the same team',
        );
      }
      updateData.reportsTo = new Types.ObjectId(addMemberDto.reportsTo);
    } else {
      updateData.reportsTo = new Types.ObjectId(team.managerId as any);
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true },
    );

    if (updatedUser) {
      // Ensure member is visible inside the team document directly
      await this.teamModel.findByIdAndUpdate(teamId, {
        $addToSet: { members: updatedUser._id },
      });
    }

    return { message: 'Member added to team successfully', user: updatedUser };
  }

  async syncMembers(teamId: string, syncDto: any) {
    const {
      managerId,
      teamLeaderIds = [],
      managerMemberIds = [],
      tlMembers = {},
    } = syncDto;

    // 1. Unassign everyone currently in the team
    await this.userModel.updateMany(
      { teamId: new Types.ObjectId(teamId) },
      { $unset: { teamId: 1, reportsTo: 1 } },
    );

    // 2. Clear members array in team
    await this.teamModel.findByIdAndUpdate(teamId, { members: [] });

    // 3. Assign new Manager
    const manager = await this.userModel.findById(managerId);
    if (manager) {
      manager.teamId = new Types.ObjectId(teamId);
      manager.reportsTo = null as any;
      await manager.save();
      await this.teamModel.findByIdAndUpdate(teamId, {
        $push: { members: manager._id },
      });
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
          await this.addMember(teamId, {
            userId: userId as string,
            reportsTo: tlId,
          });
        }
      }
    }

    return { message: 'Team members synced successfully' };
  }

  async getHierarchy(teamId: string, requestUserId?: string) {
    const team = await this.teamModel.findById(teamId).lean();
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Get all users in this team (explicitly cast to ObjectId to ensure match)
    const users = await this.userModel
      .find({ teamId: new Types.ObjectId(teamId) })
      .select('_id firstName lastName email employeeId role profileImage reportsTo teamId')
      .lean();

    // Build tree function
    const buildTree = (managerId: string) => {
      const directReports = users.filter(
        (u) => u.reportsTo?.toString() === managerId,
      );

      return directReports.map((report) => {
        const childReports = buildTree(report._id.toString());
        return {
          id: report._id,
          name: `${report.firstName} ${report.lastName}`,
          role: report.role,
          email: report.email,
          employeeId: report.employeeId,
          profileImage: report.profileImage || null,
          directReportsCount: childReports.length,
          directReports: childReports,
        };
      });
    };

    const manager = await this.userModel.findById(team.managerId).lean();

    let isTLRequest = false;
    let tlUser: any = null;
    if (requestUserId) {
      const reqUser = await this.userModel.findById(requestUserId).lean();
      if (
        reqUser &&
        ['TEAM_LEADER', 'TL', 'LEADER'].includes(
          (reqUser.role || '').toUpperCase().replace(/[\s-]+/g, '_'),
        )
      ) {
        isTLRequest = true;
        tlUser = reqUser;
      }
    }

    // If Team Leader: Show Manager at top -> TL -> TL's direct reports (excluding other TLs & branches)
    if (isTLRequest && tlUser && manager) {
      const tlReports = buildTree(tlUser._id.toString());
      const tlNode = {
        id: tlUser._id,
        name: `${tlUser.firstName} ${tlUser.lastName}`,
        role: tlUser.role,
        email: tlUser.email,
        employeeId: tlUser.employeeId,
        profileImage: tlUser.profileImage || null,
        directReportsCount: tlReports.length,
        directReports: tlReports,
      };

      return {
        teamName: team.name,
        teamId: team._id,
        manager: {
          id: manager._id,
          name: `${manager.firstName} ${manager.lastName}`,
          role: manager.role,
          email: manager.email,
          employeeId: manager.employeeId,
          profileImage: manager.profileImage || null,
          directReportsCount: 1,
          teamMembersCount: tlReports.length + 2,
          directReports: [tlNode],
        },
      };
    }

    const managerReports = manager ? buildTree(manager._id.toString()) : [];

    return {
      teamName: team.name,
      teamId: team._id,
      manager: manager
        ? {
            id: manager._id,
            name: `${manager.firstName} ${manager.lastName}`,
            role: manager.role,
            email: manager.email,
            employeeId: manager.employeeId,
            profileImage: manager.profileImage || null,
            directReportsCount: managerReports.length,
            teamMembersCount: team.members?.length || users.length,
            directReports: managerReports,
          }
        : null,
    };
  }

  async update(id: string, updateTeamDto: any) {
    const team = await this.teamModel.findByIdAndUpdate(id, updateTeamDto, {
      new: true,
      runValidators: true,
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async remove(id: string) {
    const team = await this.teamModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return { message: 'Team successfully deleted (deactivated)' };
  }

  async findAll(requestUserId?: string) {
    const teams = await this.teamModel
      .find({ isActive: true })
      .populate('managerId', 'firstName lastName email role')
      .lean();

    if (!requestUserId) {
      return teams;
    }

    const reqUser = await this.userModel.findById(requestUserId).lean();
    if (!reqUser) {
      return teams;
    }

    const rawRole = (reqUser.role || '').toUpperCase().replace(/[\s-]+/g, '_');
    const isTL = ['TEAM_LEADER', 'TL', 'LEADER'].includes(rawRole);

    if (isTL) {
      // Find all direct reports of this TL
      const directReportIds = await this.userModel
        .find({ reportsTo: reqUser._id, isActive: { $ne: false } })
        .distinct('_id');

      return teams.map((team: any) => {
        const isMyTeam =
          team._id.toString() === reqUser.teamId?.toString() ||
          (team.members || []).some(
            (m: any) => m.toString() === reqUser._id.toString(),
          );

        if (isMyTeam) {
          const managerId = team.managerId?._id || team.managerId;
          // TL sees: Manager, TL themself, and direct report members
          const tlVisibleMembers = [
            ...(managerId ? [managerId] : []),
            reqUser._id,
            ...directReportIds,
          ];

          return {
            ...team,
            members: tlVisibleMembers,
          };
        }
        return team;
      });
    }

    return teams;
  }
}
