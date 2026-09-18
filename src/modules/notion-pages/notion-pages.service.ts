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
    let parentPageId = createDto.parentId;
    let assignedMemberId = null;

    if (parentPageId && parentPageId.startsWith('user_')) {
      assignedMemberId = parentPageId.replace('user_', '');
      parentPageId = null;
    }

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

    // A "team root folder" id (from the sidebar's Shared Workspaces roots) is a
    // Team _id, not a NotionPage _id. If a sub-page is created directly under a
    // team root, don't try to store it as parentPageId (no such Page exists) —
    // store it as a generic team page instead by leaving parentPageId null and
    // relying on teamId, matching how getTree() groups "genericPages".
    if (parentPageId && !parentPageId.startsWith('user_')) {
      const isTeamRoot = await this.teamModel.exists({ _id: parentPageId });
      if (isTeamRoot) {
        parentPageId = null;
      }
    }

    const page = new this.pageModel({
      ...createDto,
      parentPageId: parentPageId ? new Types.ObjectId(parentPageId) : null,
      assignedMemberId: assignedMemberId ? new Types.ObjectId(assignedMemberId) : null,
      createdBy: user._id,
      teamId: user.teamId,
    });
    return page.save();
  }

  private async getRootAssignedMemberId(page: any): Promise<string | null> {
    let current = page;
    while (current && !current.assignedMemberId && current.parentPageId) {
      current = await this.pageModel.findById(current.parentPageId).lean();
    }
    return current?.assignedMemberId ? current.assignedMemberId.toString() : null;
  }

  private async checkAccess(page: any, user: any) {
    const role = user.role?.toUpperCase();
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) return true;

    const assignedToId = await this.getRootAssignedMemberId(page);

    if (assignedToId) {
      if (assignedToId === user._id.toString()) return true;

      const assignedUser = await this.userModel.findById(assignedToId).lean();
      if (!assignedUser) return false;

      if (role === 'MANAGER' && assignedUser.teamId?.toString() === user.teamId?.toString()) {
        return true;
      }

      if (role === 'TEAM_LEADER' && assignedUser.reportsTo?.toString() === user._id.toString()) {
        return true;
      }

      return false;
    }

    if (page.teamId) {
      if (['MANAGER', 'TEAM_LEADER'].includes(role) && page.teamId.toString() === user.teamId?.toString()) {
        return true;
      }
      if (page.createdBy?.toString() === user._id.toString()) return true;
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
      if (user.teamId) {
        allowedTeamIds = [user.teamId.toString()];
        const teamUsers = await this.userModel.find({ teamId: user.teamId, isActive: true }).lean();
        allowedUserIds = teamUsers.map(u => u._id.toString());
      } else {
        allowedUserIds = [user._id.toString()];
      }
    } else if (role === 'TEAM_LEADER') {
      if (user.teamId) allowedTeamIds = [user.teamId.toString()];
      const reports = await this.userModel.find({ reportsTo: user._id, isActive: true }).lean();
      allowedUserIds = [user._id.toString(), ...reports.map(r => r._id.toString())];
    } else {
      if (user.teamId) allowedTeamIds = [user.teamId.toString()];
      allowedUserIds = [user._id.toString()];
    }

    const activeTeams = await this.teamModel.find({ isActive: true, ...(allowedTeamIds.length > 0 ? { _id: { $in: allowedTeamIds } } : {}) }).lean();
    const allUsers = await this.userModel.find({ isActive: true, ...(allowedUserIds.length > 0 ? { _id: { $in: allowedUserIds } } : {}) }).lean();

    const teamFolders = activeTeams.map(team => {
      const teamIdStr = team._id.toString();
      const teamMembers = allUsers.filter(u => u.teamId?.toString() === teamIdStr);

      const memberNodes = teamMembers.map(u => {
        const userIdStr = u._id.toString();
        return {
          _id: `user_${userIdStr}`,
          id: `user_${userIdStr}`,
          title: `${u.firstName} ${u.lastName} (${u.role === 'MANAGER' ? 'Manager' : 'Member'})`,
          pageType: 'PAGE',
          section: 'SHARED',
          children: pages.filter(p => p.assignedMemberId?.toString() === userIdStr && !p.parentPageId)
        };
      });

      const genericPages = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(role)
        ? pages.filter(p => p.teamId?.toString() === teamIdStr && !p.parentPageId && !p.assignedMemberId)
        : [];

      return {
        _id: teamIdStr,
        id: teamIdStr,
        title: team.name,
        pageType: 'PAGE',
        section: 'SHARED',
        children: [...memberNodes, ...genericPages]
      };
    });

    return {
      shared: teamFolders,
      private: pages.filter(p => p.section === 'PRIVATE' && p.createdBy?.toString() === user._id.toString()),
      workspace: pages.filter(p => p.section === 'WORKSPACE' && (['SUPER_ADMIN', 'ADMIN'].includes(role) || p.createdBy?.toString() === user._id.toString())),
      tree: pages
    };
  }

  
  private async buildTeamRootNode(team: any, user: any, role: string) {
    const teamIdStr = team._id.toString();
    const pages = await this.pageModel.find({ isDeleted: false }).lean();
    
    let allowedUserIds: string[] = [];
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      const allUsers = await this.userModel.find({ isActive: true }).lean();
      allowedUserIds = allUsers.map(u => u._id.toString());
    } else if (role === 'MANAGER') {
      const teamUsers = await this.userModel.find({ teamId: user.teamId, isActive: true }).lean();
      allowedUserIds = teamUsers.map(u => u._id.toString());
    } else if (role === 'TEAM_LEADER') {
      const reports = await this.userModel.find({ reportsTo: user._id, isActive: true }).lean();
      allowedUserIds = [user._id.toString(), ...reports.map(r => r._id.toString())];
    } else {
      allowedUserIds = [user._id.toString()];
    }

    const teamMembers = await this.userModel.find({ 
      teamId: team._id, 
      isActive: true,
      _id: { $in: allowedUserIds } 
    }).lean();

    const memberNodes = teamMembers.map(u => {
      const userIdStr = u._id.toString();
      return {
        _id: `user_${userIdStr}`,
        id: `user_${userIdStr}`,
        title: `${u.firstName} ${u.lastName} (${u.role === 'MANAGER' ? 'Manager' : 'Member'})`,
        pageType: 'PAGE',
        section: 'SHARED',
        children: pages.filter(p => p.assignedMemberId?.toString() === userIdStr && !p.parentPageId)
      };
    });

    const genericPages = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(role)
      ? pages.filter(p => p.teamId?.toString() === teamIdStr && !p.parentPageId && !p.assignedMemberId)
      : [];

    return {
      _id: teamIdStr,
      id: teamIdStr,
      title: team.name,
      pageType: 'PAGE', // synthetic folder node, not a real sheet/page — no rows/columns of its own
      section: 'SHARED',
      rows: [],
      columns: [],
      children: [...memberNodes, ...genericPages]
    };
  }

  async getPageById(id: string, user: any) {
    const pages = await this.pageModel.find({ isDeleted: false }).lean();
    const role = user.role?.toUpperCase();

    if (id.startsWith('user_')) {
      const userId = id.replace('user_', '');

      if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        if (userId !== user._id.toString()) {
          if (role === 'MANAGER') {
            const targetUser = await this.userModel.findById(userId).lean();
            if (!targetUser || targetUser.teamId?.toString() !== user.teamId?.toString()) {
              throw new ForbiddenException('Not allowed to view this folder');
            }
          } else if (role === 'TEAM_LEADER') {
            const targetUser = await this.userModel.findById(userId).lean();
            if (!targetUser || targetUser.reportsTo?.toString() !== user._id.toString()) {
              throw new ForbiddenException('Not allowed to view this folder');
            }
          } else {
            throw new ForbiddenException('Not allowed to view this folder');
          }
        }
      }

      const targetUser = await this.userModel.findById(userId).lean();
      if (!targetUser) throw new NotFoundException('User not found');

      return {
        _id: id,
        id: id,
        title: `${targetUser.firstName} ${targetUser.lastName}-`,
        pageType: 'PAGE', // Empty page that just holds child sheets
        section: 'SHARED',
        rows: [],
        columns: [],
        children: pages.filter(p => p.assignedMemberId?.toString() === userId && !p.parentPageId)
      };
    }

    // Team root folder (its id is a Team _id, not a NotionPage _id — see getTree()).
    // Without this branch, selecting/auto-selecting a team root 404s against the
    // pages collection since no such Page document exists.
    if (Types.ObjectId.isValid(id)) {
      const team = await this.teamModel.findById(id).lean();
      if (team) {
        if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
          const isMyTeam = user.teamId?.toString() === id;
          const canManageTeam = ['MANAGER', 'TEAM_LEADER'].includes(role) && isMyTeam;
          if (!isMyTeam && !canManageTeam) {
            throw new ForbiddenException('Not allowed to view this team folder');
          }
        }
        return this.buildTeamRootNode(team, user, role);
      }
    }

    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess) throw new ForbiddenException('You do not have access to this page');

    // Attach child pages for normal pages too
    const children = pages.filter(p => p.parentPageId?.toString() === id);
    return { ...page, children };
  }

  async updatePage(id: string, updateData: any, user: any) {
    // Team root folders and user_ folders are synthetic containers, not real
    // NotionPage documents — nothing to patch on them. Reject early instead
    // of letting a stray PATCH from the client 404 against pageModel.
    if (id.startsWith('user_')) {
      throw new BadRequestException('Cannot update a user folder directly');
    }
    if (Types.ObjectId.isValid(id)) {
      const isTeamRoot = await this.teamModel.exists({ _id: id });
      if (isTeamRoot) {
        throw new BadRequestException('Cannot update a team folder directly');
      }
    }

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

    if (id.startsWith('user_')) {
      throw new BadRequestException('Cannot clear data on a user folder');
    }
    if (Types.ObjectId.isValid(id)) {
      const isTeamRoot = await this.teamModel.exists({ _id: id });
      if (isTeamRoot) {
        throw new BadRequestException('Cannot clear data on a team folder');
      }
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