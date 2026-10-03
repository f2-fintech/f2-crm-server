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

      const allPages = await this.pageModel.find({ teamId, isDeleted: false }).select('rows').lean();
      const pipeline: Record<string, number> = { 'New Leads': 0, 'Document Verification': 0, 'Underwriting / Credit': 0, 'Approved / Disbursed': 0 };
      allPages.forEach(page => {
        if (!page.rows) return;
        page.rows.forEach((row: any) => {
          const s = (row.status || row.Status || 'New Leads').toString().trim().toLowerCase();
          if (s.includes('doc') || s.includes('verif')) pipeline['Document Verification']++;
          else if (s.includes('underwrit') || s.includes('credit') || s.includes('process')) pipeline['Underwriting / Credit']++;
          else if (s.includes('approv') || s.includes('disburs')) pipeline['Approved / Disbursed']++;
          else pipeline['New Leads']++;
        });
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

      const allPages = await this.pageModel.find({ assignedMemberId: user.id || user._id, isDeleted: false }).select('rows').lean();
      const pipeline: Record<string, number> = { 'New Leads': 0, 'Document Verification': 0, 'Underwriting / Credit': 0, 'Approved / Disbursed': 0 };
      allPages.forEach(page => {
        if (!page.rows) return;
        page.rows.forEach((row: any) => {
          const s = (row.status || row.Status || 'New Leads').toString().trim().toLowerCase();
          if (s.includes('doc') || s.includes('verif')) pipeline['Document Verification']++;
          else if (s.includes('underwrit') || s.includes('credit') || s.includes('process')) pipeline['Underwriting / Credit']++;
          else if (s.includes('approv') || s.includes('disburs')) pipeline['Approved / Disbursed']++;
          else pipeline['New Leads']++;
        });
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
      allPages,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.teamModel.countDocuments({ isActive: true }),
      this.branchModel.countDocuments({ isActive: true }),
      this.departmentModel.countDocuments({ isActive: true }),
      this.roleModel.countDocuments({ isActive: true }),
      this.pageModel.find({ isDeleted: false }).select('rows').lean(),
    ]);

    const pipeline: Record<string, number> = {
      'New Leads': 0,
      'Document Verification': 0,
      'Underwriting / Credit': 0,
      'Approved / Disbursed': 0,
    };

    allPages.forEach(page => {
      if (!page.rows) return;
      page.rows.forEach((row: any) => {
        const s = (row.status || row.Status || 'New Leads').toString().trim();
        // Just map common strings or default to 'New Leads'
        if (s.toLowerCase().includes('doc') || s.toLowerCase().includes('verif')) {
          pipeline['Document Verification']++;
        } else if (s.toLowerCase().includes('underwrit') || s.toLowerCase().includes('credit') || s.toLowerCase().includes('process')) {
          pipeline['Underwriting / Credit']++;
        } else if (s.toLowerCase().includes('approv') || s.toLowerCase().includes('disburs')) {
          pipeline['Approved / Disbursed']++;
        } else {
          pipeline['New Leads']++;
        }
      });
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
