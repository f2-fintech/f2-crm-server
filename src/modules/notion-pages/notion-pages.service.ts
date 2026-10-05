import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotionPage, NotionPageDocument } from './schemas/notion-page.schema';
import { NotionLead, NotionLeadDocument } from './schemas/notion-lead.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Team, TeamDocument } from '../teams/schemas/team.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotionPagesService {
  constructor(
    @InjectModel(NotionPage.name) private readonly pageModel: Model<NotionPageDocument>,
    @InjectModel(NotionLead.name) private readonly leadModel: Model<NotionLeadDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
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
          throw new ForbiddenException('You can only assign pages to yourself');
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
    
    const saved = await page.save();

    if (assignedMemberId && assignedMemberId !== user._id.toString()) {
      await this.notificationsService.createNotification({
        recipient: assignedMemberId,
        title: 'New Page Assigned',
        message: `You have been assigned to the new page "${saved.title}" by ${user.firstName} ${user.lastName}.`,
        type: 'PAGE_ASSIGNED',
        relatedPageId: saved._id.toString(),
      });

      // Fetch assignee to get email
      const assignee = await this.userModel.findById(assignedMemberId).lean();
      if (assignee && assignee.email) {
        this.mailService.sendPageAssignmentEmail(
          assignee.email, 
          `${assignee.firstName} ${assignee.lastName}`, 
          saved.title, 
          saved._id.toString()
        ).catch(e => console.error("Mail error:", e));
      }
    }

    return saved;
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
      const pageTeam = await this.teamModel.findById(page.teamId).lean();
      if (pageTeam) {
        if (pageTeam.managerId?.toString() === user._id.toString()) return true;
        if (pageTeam.members?.some((m: any) => m.toString() === user._id.toString())) return true;
      }
      if (page.teamId.toString() === user.teamId?.toString()) return true;
      if (page.createdBy?.toString() === user._id.toString()) return true;
      return false;
    }

    if (page.createdBy?.toString() === user._id.toString()) return true;
    return false;
  }

  async getTree(user: any) {
    const pages = await this.pageModel.find({ isDeleted: false, parentPageId: null }).select('-rows -content').lean();

    const pagesByAssignedMember = new Map();
    const genericPagesByTeam = new Map();

    pages.forEach(p => {
      if (!p.parentPageId) {
        if (p.assignedMemberId) {
          const uid = p.assignedMemberId.toString();
          if (!pagesByAssignedMember.has(uid)) pagesByAssignedMember.set(uid, []);
          pagesByAssignedMember.get(uid).push(p);
        } else if (p.teamId) {
          const tid = p.teamId.toString();
          if (!genericPagesByTeam.has(tid)) genericPagesByTeam.set(tid, []);
          genericPagesByTeam.get(tid).push(p);
        }
      }
    });

    let allowedTeamIds: string[] = [];
    let allowedUserIds: string[] = [];
    const role = user.role?.toUpperCase();

    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      const activeTeams = await this.teamModel.find({ isActive: true }).lean();
      const allUsers = await this.userModel.find({ isActive: true }).lean();
      allowedTeamIds = activeTeams.map(t => t._id.toString());
      allowedUserIds = allUsers.map(u => u._id.toString());
    } else if (role === 'MANAGER') {
      const managedTeams = await this.teamModel.find({ 
        isActive: true, 
        $or: [{ managerId: user._id }, { members: user._id }] 
      }).lean();
      const managedTeamIds = managedTeams.map(t => t._id.toString());
      
      if (user.teamId && !managedTeamIds.includes(user.teamId.toString())) {
        managedTeamIds.push(user.teamId.toString());
      }
      allowedTeamIds = managedTeamIds;

      if (allowedTeamIds.length > 0) {
        const teamUsers = await this.userModel.find({ teamId: { $in: allowedTeamIds }, isActive: true }).lean();
        allowedUserIds = [...new Set([...teamUsers.map(u => u._id.toString()), user._id.toString()])];
      } else {
        allowedUserIds = [user._id.toString()];
      }
    } else if (role === 'TEAM_LEADER') {
      const leaderTeams = await this.teamModel.find({ 
        isActive: true, 
        members: user._id 
      }).lean();
      const leaderTeamIds = leaderTeams.map(t => t._id.toString());
      
      if (user.teamId && !leaderTeamIds.includes(user.teamId.toString())) {
        leaderTeamIds.push(user.teamId.toString());
      }
      allowedTeamIds = leaderTeamIds;
      
      const reports = await this.userModel.find({ reportsTo: user._id, isActive: true }).lean();
      allowedUserIds = [user._id.toString(), ...reports.map(r => r._id.toString())];
    } else {
      const memberTeams = await this.teamModel.find({ 
        isActive: true, 
        members: user._id 
      }).lean();
      const memberTeamIds = memberTeams.map(t => t._id.toString());
      
      if (user.teamId && !memberTeamIds.includes(user.teamId.toString())) {
        memberTeamIds.push(user.teamId.toString());
      }
      allowedTeamIds = memberTeamIds;
      
      allowedUserIds = [user._id.toString()];
    }

    let activeTeams: any[] = [];
    let allUsers: any[] = [];

    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      activeTeams = await this.teamModel.find({ isActive: true }).lean();
      allUsers = await this.userModel.find({ isActive: true }).lean();
    } else {
      if (allowedTeamIds.length > 0) {
        activeTeams = await this.teamModel.find({ isActive: true, _id: { $in: allowedTeamIds } }).lean();
      }
      if (allowedUserIds.length > 0) {
        allUsers = await this.userModel.find({ isActive: true, _id: { $in: allowedUserIds } }).lean();
      }
    }

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
          children: pagesByAssignedMember.get(userIdStr) || []
        };
      });

      const genericPages = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(role)
        ? (genericPagesByTeam.get(teamIdStr) || [])
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
    };
  }

  
  private async buildTeamRootNode(team: any, user: any, role: string) {
    const teamIdStr = team._id.toString();
    const teamPages = await this.pageModel.find({ teamId: team._id, isDeleted: false, parentPageId: null }).select('-rows -content').lean();
    
    let allowedUserIds: string[] = [];
    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      const allUsers = await this.userModel.find({ isActive: true }).lean();
      allowedUserIds = allUsers.map(u => u._id.toString());
    } else if (role === 'MANAGER') {
      const managedTeams = await this.teamModel.find({ 
        isActive: true, 
        $or: [{ managerId: user._id }, { members: user._id }] 
      }).lean();
      const managedTeamIds = managedTeams.map(t => t._id.toString());
      if (user.teamId && !managedTeamIds.includes(user.teamId.toString())) {
        managedTeamIds.push(user.teamId.toString());
      }
      if (managedTeamIds.length > 0) {
        const teamUsers = await this.userModel.find({ teamId: { $in: managedTeamIds }, isActive: true }).lean();
        allowedUserIds = [...new Set([...teamUsers.map(u => u._id.toString()), user._id.toString()])];
      } else {
        allowedUserIds = [user._id.toString()];
      }
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
        children: teamPages.filter(p => p.assignedMemberId?.toString() === userIdStr)
      };
    });

    const genericPages = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(role)
      ? teamPages.filter(p => !p.assignedMemberId)
      : [];

    return {
      _id: teamIdStr,
      id: teamIdStr,
      title: team.name,
      pageType: 'PAGE',
      section: 'SHARED',
      rows: [],
      columns: [],
      children: [...memberNodes, ...genericPages]
    };
  }

  async getPageById(id: string, user: any) {
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

      const userPages = await this.pageModel.find({ assignedMemberId: userId as any, parentPageId: null, isDeleted: false }).select('-rows -content').lean();

      return {
        _id: id,
        id: id,
        title: `${targetUser.firstName} ${targetUser.lastName}-`,
        pageType: 'PAGE',
        section: 'SHARED',
        rows: [],
        columns: [],
        children: userPages
      };
    }

    if (Types.ObjectId.isValid(id)) {
      const team = await this.teamModel.findById(id).lean();
      if (team) {
        if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
          const isMyTeam = 
            user.teamId?.toString() === id || 
            team.managerId?.toString() === user._id.toString() || 
            team.members?.some((m: any) => m.toString() === user._id.toString());
            
          if (!isMyTeam) {
            throw new ForbiddenException('Not allowed to view this team folder');
          }
        }
        return this.buildTeamRootNode(team, user, role);
      }
    }

    const page = await this.pageModel.findById(id)
      .populate('assignmentLogs.assignedTo', 'firstName lastName')
      .populate('assignmentLogs.assignedBy', 'firstName lastName')
      .populate('updateLogs.updatedBy', 'firstName lastName')
      .lean();
    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess) throw new ForbiddenException('You do not have access to this page');

    const children = await this.pageModel.find({ parentPageId: id as any, isDeleted: false }).select('-rows -content').lean();
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

    if (updateData.assignedMemberId && updateData.assignedMemberId !== page.assignedMemberId?.toString()) {
      const role = user.role?.toUpperCase();
      if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        if (role === 'MANAGER') {
          const targetUser = await this.userModel.findById(updateData.assignedMemberId).lean();
          if (!targetUser || targetUser.teamId?.toString() !== user.teamId?.toString()) {
            throw new ForbiddenException('Can only assign to your team members');
          }
        } else if (role === 'TEAM_LEADER') {
          const targetUser = await this.userModel.findById(updateData.assignedMemberId).lean();
          if (!targetUser || targetUser.reportsTo?.toString() !== user._id.toString()) {
            throw new ForbiddenException('Can only assign to your direct reports');
          }
        } else {
          throw new ForbiddenException('Not allowed to reassign this page');
        }
      }
    }

    let pushUpdate: any = {};
    const pushObj: any = {};

    if (updateData.assignedMemberId && updateData.assignedMemberId !== page.assignedMemberId?.toString()) {
      pushObj.assignmentLogs = {
        assignedTo: new Types.ObjectId(updateData.assignedMemberId),
        assignedBy: user._id,
        assignedAt: new Date()
      };
    }

    if (updateData.rows || updateData.columns) {
      pushObj.updateLogs = {
        updatedBy: user._id,
        updatedAt: new Date(),
        action: 'Updated sheet data'
      };
    } else if (updateData.content) {
      pushObj.updateLogs = {
        updatedBy: user._id,
        updatedAt: new Date(),
        action: 'Updated document content'
      };
    }

    if (Object.keys(pushObj).length > 0) {
      pushUpdate.$push = pushObj;
    }

    const updatedPage = await this.pageModel.findByIdAndUpdate(
      id, 
      { ...updateData, ...pushUpdate }, 
      { new: true }
    )
    .populate('assignmentLogs.assignedTo', 'firstName lastName')
    .populate('assignmentLogs.assignedBy', 'firstName lastName')
    .populate('updateLogs.updatedBy', 'firstName lastName');

    if (!updatedPage) {
      throw new NotFoundException('Page not found');
    }

    if (updateData.assignedMemberId && updateData.assignedMemberId !== page.assignedMemberId?.toString()) {
      await this.notificationsService.createNotification({
        recipient: updateData.assignedMemberId,
        title: 'New Page Assigned',
        message: `You have been assigned to the page "${updatedPage.title}" by ${user.firstName} ${user.lastName}.`,
        type: 'PAGE_ASSIGNED',
        relatedPageId: id,
      });

      // Fetch assignee to get email
      const assignee = await this.userModel.findById(updateData.assignedMemberId).lean();
      if (assignee && assignee.email) {
        this.mailService.sendPageAssignmentEmail(
          assignee.email, 
          `${assignee.firstName} ${assignee.lastName}`, 
          updatedPage.title, 
          id
        ).catch(e => console.error("Mail error:", e));
      }
    }
    
    return updatedPage;
  }

  async deletePage(id: string, user: any) {
    const role = user.role?.toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only admins can delete pages');
    }

    if (id.startsWith('user_')) {
      throw new BadRequestException('Cannot delete a user folder');
    }
    if (Types.ObjectId.isValid(id)) {
      const isTeamRoot = await this.teamModel.exists({ _id: id });
      if (isTeamRoot) {
        throw new BadRequestException('Cannot delete a team folder');
      }
    }

    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');

    await this.pageModel.findByIdAndUpdate(id, { 
      isDeleted: true,
      deletedBy: user._id || user.id,
      deletedAt: new Date()
    });
    return { success: true };
  }

  async getActivityLog(id: string, user: any) {
    if (id.startsWith('user_') || !Types.ObjectId.isValid(id)) {
      return { logs: [] };
    }

    const page = await this.pageModel.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedMemberId', 'firstName lastName email')
      .populate({
        path: 'assignmentLogs.assignedTo',
        select: 'firstName lastName email',
      })
      .populate({
        path: 'assignmentLogs.assignedBy',
        select: 'firstName lastName email',
      })
      .populate({
        path: 'updateLogs.updatedBy',
        select: 'firstName lastName email',
      })
      .lean();

    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess) throw new ForbiddenException('Access denied');

    // Build a unified timeline of events
    const logs: any[] = [];

    // Creation event
    if (page.createdBy) {
      logs.push({
        type: 'CREATED',
        action: 'Page created',
        actor: page.createdBy,
        timestamp: (page as any).createdAt || new Date(),
      });
    }

    // Assignment logs
    for (const al of (page.assignmentLogs || [])) {
      logs.push({
        type: 'ASSIGNED',
        action: `Page assigned`,
        actor: al.assignedBy,
        target: al.assignedTo,
        timestamp: al.assignedAt,
      });
    }

    // Update logs
    for (const ul of (page.updateLogs || [])) {
      logs.push({
        type: 'UPDATED',
        action: ul.action || 'Page updated',
        actor: ul.updatedBy,
        timestamp: ul.updatedAt,
      });
    }

    // Sort by timestamp descending (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { logs, page: { _id: page._id, title: page.title } };
  }

  async getDeletedPages(user: any) {
    const role = user.role?.toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only admins can view deleted pages');
    }
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    return this.pageModel.find({ 
      isDeleted: true,
      deletedAt: { $gte: fortyFiveDaysAgo }
    })
    .populate({
      path: 'createdBy',
      select: 'firstName lastName email teamId',
      populate: { path: 'teamId', select: 'name' }
    })
    .populate('deletedBy', 'firstName lastName email')
    .lean();
  }

  async restorePage(id: string, user: any) {
    const role = user.role?.toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only admins can restore pages');
    }
    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');
    
    await this.pageModel.findByIdAndUpdate(id, { 
      $set: { isDeleted: false },
      $unset: { deletedBy: 1, deletedAt: 1 }
    });
    return { success: true };
  }

  @Cron('0 0 * * *') // Run every day at midnight
  async purgeExpiredTrash() {
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    await this.pageModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: fortyFiveDaysAgo }
    });
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
      { 
        columns: [], 
        rows: [],
        $push: {
          updateLogs: {
            updatedBy: user._id,
            updatedAt: new Date(),
            action: 'Cleared sheet data'
          }
        }
      },
      { new: true },
    );
    return updatedPage;
  }

  async shareEmail(pageId: string, email: string) {
    const token = 'mock_token_123_' + Date.now();
    
    // Dispatch real email using MailService
    this.mailService.sendPageInviteEmail(email, token).catch(e => console.error("Invite Mail error:", e));
    
    return { success: true, message: 'Invite sent', token };
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

  async getAllRemarks(user: any) {
    const role = user.role?.toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only admins can view unified remarks');
    }

    const pages = await this.pageModel.aggregate([
      { $match: { isDeleted: false, pageType: 'SHEET' } },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedMemberId',
          foreignField: '_id',
          as: 'assignedMember'
        }
      },
      {
        $project: {
          title: 1,
          columns: 1,
          rows: 1,
          createdAt: 1,
          teamId: { $arrayElemAt: ['$team', 0] },
          assignedMemberId: { $arrayElemAt: ['$assignedMember', 0] }
        }
      }
    ]);

    return pages.map(page => {
      const teamName = page.teamId?.name || 'Unassigned';
      const assignedTo = page.assignedMemberId
        ? `${page.assignedMemberId.firstName} ${page.assignedMemberId.lastName}`
        : 'Unassigned';

      // Build a column key → column name map (col_0 → "Name", col_1 → "Mobile", etc.)
      const colMap: Record<string, string> = {};
      if (Array.isArray(page.columns)) {
        page.columns.forEach((col: any) => {
          if (col.key && col.name) {
            colMap[col.key] = col.name;
          }
        });
      }

      // Identify which columns contain remarks/feedback
      const remarkKeys = Object.entries(colMap)
        .filter(([, name]) => {
          const n = name.toLowerCase();
          return n.includes('remark') || n.includes('feedback') || n.includes('comment') || n.includes('note');
        })
        .map(([key]) => key);

      // Also look for raw keys that look like feedback fields even without column map
      const allRowKeys = new Set<string>();
      (page.rows || []).forEach((row: any) => {
        Object.keys(row).forEach(k => {
          if (k !== 'id') allRowKeys.add(k);
        });
      });
      allRowKeys.forEach(k => {
        const kl = k.toLowerCase();
        if (kl.includes('remark') || kl.includes('feedback') || kl.includes('comment') || kl.includes('note')) {
          if (!remarkKeys.includes(k)) remarkKeys.push(k);
        }
      });

      // Map rows to human-readable objects
      const mappedRows = (page.rows || []).map((row: any) => {
        const readable: Record<string, any> = { _rowId: row.id };
        Object.entries(row).forEach(([key, value]) => {
          if (key === 'id') return;
          const humanKey = colMap[key] || key; // fallback to raw key if no mapping
          readable[humanKey] = value;
        });
        return readable;
      });

      // Compute movement stats for this page
      let remarksFilled = 0;
      let remarksEmpty = 0;
      const remarkKeyNames = remarkKeys.map(k => colMap[k] || k);

      const rowsWithRemarks = mappedRows.filter((row: any) => {
        const hasRemark = remarkKeyNames.some(k => row[k] && String(row[k]).trim() !== '');
        if (hasRemark) {
          remarksFilled++;
          return true;
        } else {
          remarksEmpty++;
          return false;
        }
      });

      return {
        _id: page._id,
        title: page.title,
        teamName,
        assignedTo,
        createdAt: (page as any).createdAt,
        columns: page.columns || [],
        columnNames: Object.values(colMap),
        remarkColumnNames: remarkKeyNames,
        totalRows: mappedRows.length,
        remarksFilled,
        remarksEmpty,
        rows: rowsWithRemarks
      };
    }).filter(p => p.totalRows > 0); // Only return pages that have data
  }
}