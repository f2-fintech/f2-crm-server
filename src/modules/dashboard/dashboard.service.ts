import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { Department, DepartmentDocument } from '../departments/schemas/department.schema';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { NotionPage, NotionPageDocument } from '../notion-pages/schemas/notion-page.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(NotionPage.name) private pageModel: Model<NotionPageDocument>,
  ) {}

  async getDashboardData(user: any) {
    const role = user?.role?.toUpperCase();

    if (role === 'MANAGER' || role === 'TEAM_LEADER') {
      const teamId = user.teamId;

      const [teamSize, activeMembers, teamPages] = await Promise.all([
        this.userModel.countDocuments({ teamId }),
        this.userModel.countDocuments({ teamId, isActive: true }),
        this.pageModel.countDocuments({ teamId, isDeleted: false }),
      ]);

      // Calculate total leads by aggregating the length of rows array in pages belonging to the team
      const pages = await this.pageModel.find({ teamId, isDeleted: false }).select('rows').lean();
      const totalLeads = pages.reduce((sum, page) => sum + (Array.isArray(page.rows) ? page.rows.length : 0), 0);

      const recentUsers = await this.userModel
        .find({ teamId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email profileImage createdAt')
        .exec();

      return {
        success: true,
        data: {
          roleType: role,
          stats: {
            teamSize,
            activeMembers,
            teamPages,
            totalLeads,
          },
          recentActivity: recentUsers.map((u: any) => ({
            _id: u._id,
            title: `New team member: ${u.firstName} ${u.lastName}`,
            description: u.email,
            createdAt: u.createdAt,
            type: 'USER',
          })),
          monthlyLeads: {
            data: [
              { name: 'Jan', value: 10 },
              { name: 'Feb', value: 15 },
              { name: 'Mar', value: 20 },
              { name: 'Apr', value: 25 },
              { name: 'May', value: 35 },
              { name: 'Jun', value: 45 },
            ],
          },
        },
      };
    }

    // Default Admin/Super Admin Dashboard
    const [
      totalUsers,
      activeUsers,
      totalTeams,
      totalBranches,
      totalDepartments,
      totalRoles,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.teamModel.countDocuments(),
      this.branchModel.countDocuments(),
      this.departmentModel.countDocuments(),
      this.roleModel.countDocuments(),
    ]);

    const recentUsers = await this.userModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email profileImage createdAt')
      .exec();

    return {
      success: true,
      data: {
        roleType: 'ADMIN',
        stats: {
          totalUsers,
          activeUsers,
          totalTeams,
          totalBranches,
          totalDepartments,
          totalRoles,
        },
        recentActivity: recentUsers.map((u: any) => ({
          _id: u._id,
          title: `New user added: ${u.firstName} ${u.lastName}`,
          description: u.email,
          createdAt: u.createdAt,
          type: 'USER',
        })),
        monthlyLeads: {
          data: [
            { name: 'Jan', value: 30 },
            { name: 'Feb', value: 45 },
            { name: 'Mar', value: 25 },
            { name: 'Apr', value: 60 },
            { name: 'May', value: 80 },
            { name: 'Jun', value: 70 },
          ],
        },
      },
    };
  }
}
