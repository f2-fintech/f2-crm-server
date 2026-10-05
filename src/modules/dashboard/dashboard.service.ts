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

      const aggregateResult = await this.pageModel.aggregate([
        { $match: { teamId, isDeleted: false } },
        { $project: { rowCount: { $size: { $ifNull: ["$rows", []] } } } },
        { $group: { _id: null, total: { $sum: "$rowCount" } } }
      ]);
      const totalLeads = aggregateResult[0]?.total || 0;

      const recentUsers = await this.userModel
        .find({ teamId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email profileImage createdAt')
        .exec();

      const pipeline: Record<string, number> = { 'New Leads': 0, 'Document Verification': 0, 'Underwriting / Credit': 0, 'Approved / Disbursed': 0 };
      const statusCounts = await this.pageModel.aggregate([
        { $match: { teamId, isDeleted: false } },
        { $unwind: "$rows" },
        { $project: { status: { $toLower: { $trim: { input: { $toString: { $ifNull: ["$rows.status", { $ifNull: ["$rows.Status", "New Leads"] }] } } } } } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      statusCounts.forEach(({ _id: s, count }) => {
        if (!s) s = 'new leads';
        if (s.includes('doc') || s.includes('verif')) pipeline['Document Verification'] += count;
        else if (s.includes('underwrit') || s.includes('credit') || s.includes('process')) pipeline['Underwriting / Credit'] += count;
        else if (s.includes('approv') || s.includes('disburs')) pipeline['Approved / Disbursed'] += count;
        else pipeline['New Leads'] += count;
      });
      const pipelineData = [
        { stage: "New Leads", count: pipeline['New Leads'] },
        { stage: "Document Verification", count: pipeline['Document Verification'] },
        { stage: "Underwriting / Credit", count: pipeline['Underwriting / Credit'] },
        { stage: "Approved / Disbursed", count: pipeline['Approved / Disbursed'] }
      ];

      return {
        success: true,
        data: {
          roleType: role,
          stats: { teamSize, activeMembers, teamPages, totalLeads },
          recentActivity: recentUsers.map((u: any) => ({
            _id: u._id, title: `New team member: ${u.firstName} ${u.lastName}`, description: u.email, createdAt: u.createdAt, type: 'USER'
          })),
          pipelineData,
          monthlyLeads: { data: [{ name: 'Jan', value: 10 }, { name: 'Feb', value: 15 }, { name: 'Mar', value: 20 }, { name: 'Apr', value: 25 }, { name: 'May', value: 35 }, { name: 'Jun', value: 45 }] },
        },
      };
    }

    if (['EMPLOYEE', 'SOURCER', 'CHANNEL_PARTNER'].includes(role)) {
      const assignedPages = await this.pageModel.countDocuments({ assignedMemberId: user.id || user._id, isDeleted: false });
      const aggregateResult = await this.pageModel.aggregate([
        { $match: { assignedMemberId: user.id || user._id, isDeleted: false } },
        { $project: { rowCount: { $size: { $ifNull: ["$rows", []] } } } },
        { $group: { _id: null, total: { $sum: "$rowCount" } } }
      ]);
      const myLeads = aggregateResult[0]?.total || 0;

      const pipeline: Record<string, number> = { 'New Leads': 0, 'Document Verification': 0, 'Underwriting / Credit': 0, 'Approved / Disbursed': 0 };
      const statusCounts = await this.pageModel.aggregate([
        { $match: { assignedMemberId: user.id || user._id, isDeleted: false } },
        { $unwind: "$rows" },
        { $project: { status: { $toLower: { $trim: { input: { $toString: { $ifNull: ["$rows.status", { $ifNull: ["$rows.Status", "New Leads"] }] } } } } } } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      statusCounts.forEach(({ _id: s, count }) => {
        if (!s) s = 'new leads';
        if (s.includes('doc') || s.includes('verif')) pipeline['Document Verification'] += count;
        else if (s.includes('underwrit') || s.includes('credit') || s.includes('process')) pipeline['Underwriting / Credit'] += count;
        else if (s.includes('approv') || s.includes('disburs')) pipeline['Approved / Disbursed'] += count;
        else pipeline['New Leads'] += count;
      });
      const pipelineData = [
        { stage: "New Leads", count: pipeline['New Leads'] },
        { stage: "Document Verification", count: pipeline['Document Verification'] },
        { stage: "Underwriting / Credit", count: pipeline['Underwriting / Credit'] },
        { stage: "Approved / Disbursed", count: pipeline['Approved / Disbursed'] }
      ];

      return {
        success: true,
        data: {
          roleType: role,
          stats: { assignedPages, myLeads },
          recentActivity: [],
          pipelineData,
          monthlyLeads: { data: [] },
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
      this.teamModel.countDocuments({ isActive: true }),
      this.branchModel.countDocuments({ isActive: true }),
      this.departmentModel.countDocuments({ isActive: true }),
      this.roleModel.countDocuments({ isActive: true }),
    ]);

    const pipeline: Record<string, number> = {
      'New Leads': 0,
      'Document Verification': 0,
      'Underwriting / Credit': 0,
      'Approved / Disbursed': 0,
    };

    const statusCounts = await this.pageModel.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: "$rows" },
      { $project: { status: { $toLower: { $trim: { input: { $toString: { $ifNull: ["$rows.status", { $ifNull: ["$rows.Status", "New Leads"] }] } } } } } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    statusCounts.forEach(({ _id: s, count }) => {
      if (!s) s = 'new leads';
      if (s.includes('doc') || s.includes('verif')) {
        pipeline['Document Verification'] += count;
      } else if (s.includes('underwrit') || s.includes('credit') || s.includes('process')) {
        pipeline['Underwriting / Credit'] += count;
      } else if (s.includes('approv') || s.includes('disburs')) {
        pipeline['Approved / Disbursed'] += count;
      } else {
        pipeline['New Leads'] += count;
      }
    });

    const pipelineData = [
      { stage: "New Leads", count: pipeline['New Leads'] },
      { stage: "Document Verification", count: pipeline['Document Verification'] },
      { stage: "Underwriting / Credit", count: pipeline['Underwriting / Credit'] },
      { stage: "Approved / Disbursed", count: pipeline['Approved / Disbursed'] },
    ];

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
        pipelineData,
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
