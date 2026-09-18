import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotionPage, NotionPageDocument } from './schemas/notion-page.schema';
import { NotionLead, NotionLeadDocument } from './schemas/notion-lead.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';

@Injectable()
export class NotionPagesService {
  constructor(
    @InjectModel(NotionPage.name) private readonly pageModel: Model<NotionPageDocument>,
    @InjectModel(NotionLead.name) private readonly leadModel: Model<NotionLeadDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
  ) { }

  async createPage(createDto: any, user: any) {
    const parentPageId = createDto.parentId;
    const assignedMemberId = createDto.assignedMemberId;
    const role = user.role?.toUpperCase();

    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      if (assignedMemberId && assignedMemberId !== user._id.toString()) {
        if (role === 'MANAGER') {
          const assignedUser = await this.userModel.findById(assignedMemberId).lean();
          if (!assignedUser || assignedUser.teamId?.toString() !== user.teamId?.toString()) {
            throw new ForbiddenException('Can only assign to your team members');
          }
        } else if (role === 'TEAM_LEADER') {
          const assignedUser = await this.userModel.findById(assignedMemberId).lean();
          if (!assignedUser || assignedUser.reportsTo?.toString() !== user._id.toString()) {
            throw new ForbiddenException('Can only assign to your direct reports');
          }
        } else {
          throw new ForbiddenException('You can only create pages for yourself');
        }
      }
    }

    let teamId = user.teamId;
    if (assignedMemberId) {
      const assignedUser = await this.userModel.findById(assignedMemberId).lean();
      if (assignedUser && assignedUser.teamId) {
        teamId = assignedUser.teamId;
      }
    }

    const page = new this.pageModel({
      ...createDto,
      parentPageId: parentPageId ? new Types.ObjectId(parentPageId) : null,
      assignedMemberId: assignedMemberId ? new Types.ObjectId(assignedMemberId) : null,
      createdBy: user._id,
      teamId: teamId,
    });
    return page.save();
  }

  private async checkAccess(page: any, user: any) {
    const role = user.role?.toUpperCase();
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) return true;

    if (page.assignedMemberId) {
      const assignedToId = page.assignedMemberId.toString();
      if (assignedToId === user._id.toString()) return true;

      if (role === 'MANAGER' && page.teamId?.toString() === user.teamId?.toString()) return true;

      if (role === 'TEAM_LEADER') {
        const assignedUser = await this.userModel.findById(assignedToId).lean();
        if (assignedUser && assignedUser.reportsTo?.toString() === user._id.toString()) {
          return true;
        }
      }
      return false;
    }

    if (page.teamId) {
      if (['MANAGER', 'TEAM_LEADER'].includes(role) && page.teamId.toString() === user.teamId?.toString()) {
        return true;
      }
      return false;
    }

    if (page.createdBy?.toString() === user._id.toString()) return true;
    return false;
  }

  async getTree(user: any) {
    const pages = await this.pageModel.find({ isDeleted: false }).lean();

    let allowedTeamIds: string[] = [];
    let allowedUserIds: string[] = [];
    const role = user.role?.toUpperCase();

    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      const activeTeams = await this.teamModel.find({ isActive: true }).lean();
      const allUsers = await this.userModel.find({ isActive: true }).lean();
      allowedTeamIds = activeTeams.map(t => t._id.toString());
      allowedUserIds = allUsers.map(u => u._id.toString());
    } else if (role === 'MANAGER') {
      // Manager sees all pages in their team
      if (user.teamId) {
        allowedTeamIds = [user.teamId.toString()];
        const teamUsers = await this.userModel.find({ teamId: user.teamId, isActive: true }).lean();
        allowedUserIds = teamUsers.map(u => u._id.toString());
      } else {
        allowedUserIds = [user._id.toString()];
      }
    } else if (role === 'TEAM_LEADER') {
      // TL only sees their own page + their direct reports' pages. NOT other TLs or other teams.
      const reports = await this.userModel.find({ reportsTo: user._id, isActive: true }).lean();
      allowedUserIds = [user._id.toString(), ...reports.map(r => r._id.toString())];
      // No allowedTeamIds — don't show ALL team pages
    } else {
      // Employee sees ONLY their own assigned page
      allowedUserIds = [user._id.toString()];
      // No allowedTeamIds
    }

    const allowedPages = pages.filter(p => {
      if (['SUPER_ADMIN', 'ADMIN'].includes(role)) return true;
      // Pages explicitly assigned to an allowed user
      if (p.assignedMemberId && allowedUserIds.includes(p.assignedMemberId.toString())) return true;
      // For Manager only: unassigned team pages (generic team sheets)
      if (role === 'MANAGER' && p.teamId && allowedTeamIds.includes(p.teamId.toString()) && !p.assignedMemberId) return true;
      // Admin/manager created pages
      if (p.createdBy?.toString() === user._id.toString()) return true;
      return false;
    });

    const allowedPageIds = new Set(allowedPages.map(p => p._id.toString()));

    const buildTree = (parentId: string | null) => {
      return allowedPages
        .filter(p => (parentId ? p.parentPageId?.toString() === parentId : !p.parentPageId))
        .map(p => ({ ...p, children: buildTree(p._id.toString()) }));
    };

    // A page is a "root" for this user if:
    //   1. It has no parent at all, OR
    //   2. Its parent exists but is NOT visible to this user (parent not in allowedPages)
    // This ensures TL/Employee pages that are physically nested under a Manager page
    // still appear at the top of their sidebar since they can't see the parent.
    const isRootForUser = (p: any) => {
      if (!p.parentPageId) return true;
      return !allowedPageIds.has(p.parentPageId.toString());
    };

    const sharedTree = allowedPages
      .filter(p => p.section === 'SHARED' && isRootForUser(p))
      .map(p => ({ ...p, children: buildTree(p._id.toString()) }));

    const privateTree = allowedPages
      .filter(p => p.section === 'PRIVATE' && isRootForUser(p) && p.createdBy?.toString() === user._id.toString())
      .map(p => ({ ...p, children: buildTree(p._id.toString()) }));

    const workspaceTree = allowedPages
      .filter(p => p.section === 'WORKSPACE' && isRootForUser(p) && (['SUPER_ADMIN', 'ADMIN'].includes(role) || p.createdBy?.toString() === user._id.toString()))
      .map(p => ({ ...p, children: buildTree(p._id.toString()) }));

    return {
      shared: sharedTree,
      private: privateTree,
      workspace: workspaceTree,
      tree: allowedPages
    };
  }

  async getEligibleUsers(user: any) {
    const role = user.role?.toUpperCase();
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return this.userModel.find({ isActive: true }).select('_id firstName lastName role teamId reportsTo').lean();
    } else if (role === 'MANAGER') {
      if (!user.teamId) return [user];
      return this.userModel.find({ teamId: user.teamId, isActive: true }).select('_id firstName lastName role teamId reportsTo').lean();
    } else if (role === 'TEAM_LEADER') {
      const reports = await this.userModel.find({ reportsTo: user._id, isActive: true }).select('_id firstName lastName role teamId reportsTo').lean();
      return [user, ...reports];
    }
    return [user];
  }

  async getPageById(id: string, user: any) {
    const pages = await this.pageModel.find({ isDeleted: false }).lean();
    
    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess) throw new ForbiddenException('You do not have access to this page');

    // Attach child pages for normal pages too
    const children = pages.filter(p => p.parentPageId?.toString() === id);
    return { ...page, children };
  }

  async updatePage(id: string, updateData: any, user: any) {

    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess) throw new ForbiddenException('You do not have access to update this page');

    const updatedPage = await this.pageModel.findByIdAndUpdate(id, updateData, { new: true });
    return updatedPage;
  }

  async clearPageData(id: string, user: any) {
    // Restricted to SUPER_ADMIN/ADMIN only — enforced here, not just in the UI,
    // so a direct API call from a non-admin can't bypass the frontend's button gating.
    const role = user.role?.toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only admins can clear page data');
    }

    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');

    const updatedPage = await this.pageModel.findByIdAndUpdate(
      id,
      { columns: [], rows: [] },
      { new: true },
    );
    return updatedPage;
  }

  async shareEmail(pageId: string, email: string) {
    // Mock sharing logic
    return { success: true, message: 'Invite sent', token: 'mock_token_123', inviteLink: `https://crm.local/accept-access?token=mock_token_123` };
  }

  async acceptInvite(token: string) {
    return { success: true, message: 'Invite accepted' };
  }

  async cloneFormat(pageId: string, targetParentId?: string) {
    const page = await this.pageModel.findById(pageId).lean();
    if (!page) throw new NotFoundException('Page not found');

    const clone = new this.pageModel({
      title: `${page.title} (Clone)`,
      pageType: page.pageType,
      section: page.section,
      columns: page.columns,
      parentPageId: targetParentId || page.parentPageId,
      createdBy: page.createdBy,
      teamId: page.teamId,
      rows: [] // clone format, not data
    });

    return clone.save();
  }
}