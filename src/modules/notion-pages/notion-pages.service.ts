import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
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
export class NotionPagesService implements OnModuleInit {
  constructor(
    @InjectModel(NotionPage.name)
    private readonly pageModel: Model<NotionPageDocument>,
    @InjectModel(NotionLead.name)
    private readonly leadModel: Model<NotionLeadDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) { }

  private remarksCacheMap = new Map<string, { data: any[]; timestamp: number }>();
  private readonly REMARKS_CACHE_TTL = 90 * 1000; // 90 seconds in-memory cache

  private treeCacheMap = new Map<string, { data: any; timestamp: number }>();
  private readonly TREE_CACHE_TTL = 45 * 1000; // 45 seconds cache for instant tree loading

  public invalidateCache() {
    this.remarksCacheMap.clear();
    this.treeCacheMap.clear();
  }

  public invalidateRemarksCache() {
    this.remarksCacheMap.clear();
    this.treeCacheMap.clear();
  }

  public invalidateTreeCache() {
    this.treeCacheMap.clear();
  }

  async onModuleInit() {
    try {
      console.log('Building NotionPage indexes for performance...');
      await this.pageModel.collection.createIndex(
        { isDeleted: 1, parentPageId: 1 },
        { background: true },
      );
      await this.pageModel.collection.createIndex(
        { isDeleted: 1, pageType: 1 },
        { background: true },
      );
      await this.pageModel.collection.createIndex(
        { assignedMemberId: 1, isDeleted: 1, parentPageId: 1 },
        { background: true },
      );
      await this.pageModel.collection.createIndex(
        { teamId: 1, isDeleted: 1 },
        { background: true },
      );
      console.log('NotionPage indexes verified.');
    } catch (error) {
      console.error('Error building indexes:', error);
    }
  }

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
          const assignedUser = await this.userModel
            .findById(assignedMemberId)
            .lean();
          if (
            !assignedUser ||
            assignedUser.teamId?.toString() !== user.teamId?.toString()
          ) {
            throw new ForbiddenException(
              'Can only assign to your team members',
            );
          }
        } else if (role === 'TEAM_LEADER') {
          const assignedUser = await this.userModel
            .findById(assignedMemberId)
            .lean();
          if (
            !assignedUser ||
            assignedUser.reportsTo?.toString() !== user._id.toString()
          ) {
            throw new ForbiddenException(
              'Can only assign to your direct reports',
            );
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
      assignedMemberId: assignedMemberId
        ? new Types.ObjectId(assignedMemberId)
        : null,
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
        this.mailService
          .sendPageAssignmentEmail(
            assignee.email,
            `${assignee.firstName} ${assignee.lastName}`,
            saved.title,
            saved._id.toString(),
          )
          .catch((e) => console.error('Mail error:', e));
      }
    }

    this.invalidateCache();
    return saved;
  }

  private toSafeObjectId(id: any): Types.ObjectId | null {
    if (!id) return null;
    if (id instanceof Types.ObjectId) return id;
    const str = id.toString();
    if (Types.ObjectId.isValid(str)) {
      return new Types.ObjectId(str);
    }
    return null;
  }

  private normalizeRole(roleStr?: string): string {
    return (roleStr || '').toUpperCase().replace(/[\s-]+/g, '_');
  }

  private async getRootAssignedMemberId(page: any): Promise<string | null> {
    let current = page;
    while (current && !current.assignedMemberId && current.parentPageId) {
      current = await this.pageModel.findById(current.parentPageId).lean();
    }
    return current?.assignedMemberId
      ? current.assignedMemberId.toString()
      : null;
  }

  private async checkAccess(page: any, user: any) {
    const rawRole = this.normalizeRole(user?.role);
    if (['SUPER_ADMIN', 'ADMIN'].includes(rawRole)) return true;

    const userObjId = this.toSafeObjectId(user?._id);
    const userStr = user?._id ? user._id.toString() : '';
    const userTeamIdStr = user?.teamId ? user.teamId.toString() : '';

    const assignedToId = await this.getRootAssignedMemberId(page);

    if (assignedToId) {
      if (assignedToId === userStr) return true;

      const assignedUser = await this.userModel.findById(assignedToId).lean();
      if (!assignedUser) return false;

      const assignedUserTeamStr = assignedUser.teamId ? assignedUser.teamId.toString() : '';

      // Direct report check (for TLs/Managers)
      if (assignedUser.reportsTo?.toString() === userStr) {
        return true;
      }

      // Manager check: either in same team, or manager manages assignedUser's team
      if (rawRole === 'MANAGER') {
        if (userTeamIdStr && assignedUserTeamStr === userTeamIdStr) return true;
        if (assignedUserTeamStr) {
          const managesTeam = await this.teamModel.exists({
            _id: this.toSafeObjectId(assignedUserTeamStr),
            isActive: { $ne: false },
            $or: [{ managerId: userObjId }, { members: userObjId }],
          });
          if (managesTeam) return true;
        }
      }

      // Team Leader check: either in same team, or TL is member of assignedUser's team
      if (['TEAM_LEADER', 'TL', 'LEADER'].includes(rawRole)) {
        if (userTeamIdStr && assignedUserTeamStr === userTeamIdStr) return true;
        if (assignedUserTeamStr) {
          const inSameTeam = await this.teamModel.exists({
            _id: this.toSafeObjectId(assignedUserTeamStr),
            isActive: { $ne: false },
            members: userObjId,
          });
          if (inSameTeam) return true;
        }
      }

      return false;
    }

    if (page.teamId) {
      const pageTeamIdStr = page.teamId.toString();
      if (userTeamIdStr && pageTeamIdStr === userTeamIdStr) return true;

      const pageTeam = await this.teamModel.findById(page.teamId).lean();
      if (pageTeam) {
        if (pageTeam.managerId?.toString() === userStr) return true;
        if (pageTeam.members?.some((m: any) => m.toString() === userStr)) return true;
      }
      if (page.createdBy?.toString() === userStr) return true;
      return false;
    }

    if (page.createdBy?.toString() === userStr) return true;
    return false;
  }

  async getTree(user: any) {
    try {
      const rawRole = this.normalizeRole(user?.role);
      const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(rawRole);
      const isManager = rawRole === 'MANAGER';
      const isTeamLeader = ['TEAM_LEADER', 'TL', 'LEADER'].includes(rawRole);

      const userObjId = this.toSafeObjectId(user?._id);
      const userStr = user?._id ? user._id.toString() : '';
      const userTeamObjId = this.toSafeObjectId(user?.teamId);
      const userTeamStr = user?.teamId ? user.teamId.toString() : '';

      // Check In-Memory Cache for ultra-fast instant response (< 5ms)
      const cacheKey = `${rawRole}_${userStr}`;
      const cached = this.treeCacheMap.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.timestamp < this.TREE_CACHE_TTL) {
        return cached.data;
      }

      // Fast parallel fetch with INCLUSIVE projections (skips multi-megabyte `rows` and `content` arrays)
      const pagesPromise = this.pageModel
        .find({ isDeleted: { $ne: true } })
        .select('_id title pageType section parentPageId assignedMemberId teamId createdBy sharedWith')
        .lean();

      let teamsPromise: Promise<any[]>;
      let usersPromise: Promise<any[]>;

      if (isAdmin) {
        teamsPromise = this.teamModel
          .find({ isActive: { $ne: false } })
          .select('_id name managerId members isActive')
          .lean();
        usersPromise = this.userModel
          .find({ isActive: { $ne: false } })
          .select('_id firstName lastName email role teamId reportsTo isActive')
          .lean();
      } else {
        const teamQueryConds: any[] = [];
        if (userObjId) {
          teamQueryConds.push({ members: userObjId });
          teamQueryConds.push({ members: userStr });
          if (isManager) {
            teamQueryConds.push({ managerId: userObjId });
            teamQueryConds.push({ managerId: userStr });
          }
        }
        if (userTeamObjId) {
          teamQueryConds.push({ _id: userTeamObjId });
        }
        if (userTeamStr) {
          try {
            teamQueryConds.push({ _id: new Types.ObjectId(userTeamStr) });
          } catch (_) {}
        }

        teamsPromise = teamQueryConds.length > 0
          ? this.teamModel
              .find({ isActive: { $ne: false }, $or: teamQueryConds })
              .select('_id name managerId members isActive')
              .lean()
          : Promise.resolve([]);

        if (isManager) {
          usersPromise = this.userModel
            .find({
              isActive: { $ne: false },
              $or: [
                ...(userTeamObjId ? [{ teamId: userTeamObjId }] : []),
                ...(userObjId ? [{ _id: userObjId }] : []),
              ],
            })
            .select('_id firstName lastName email role teamId reportsTo isActive')
            .lean();
        } else if (isTeamLeader) {
          usersPromise = this.userModel
            .find({
              isActive: { $ne: false },
              $or: [
                ...(userObjId ? [{ reportsTo: userObjId }] : []),
                ...(userTeamObjId ? [{ teamId: userTeamObjId }] : []),
                ...(userObjId ? [{ _id: userObjId }] : []),
              ],
            })
            .select('_id firstName lastName email role teamId reportsTo isActive')
            .lean();
        } else {
          usersPromise = userObjId
            ? this.userModel
                .find({ isActive: { $ne: false }, _id: userObjId })
                .select('_id firstName lastName email role teamId reportsTo isActive')
                .lean()
            : Promise.resolve([]);
        }
      }

      // Execute all 3 queries in parallel
      const [allPages, activeTeams, fetchedUsers] = await Promise.all([
        pagesPromise,
        teamsPromise,
        usersPromise,
      ]);

      let allUsers = fetchedUsers;

      // If manager or TL has team members from teams that weren't captured by teamId, fetch them
      if (!isAdmin && (isManager || isTeamLeader)) {
        const teamMemberIds = activeTeams.flatMap((t: any) =>
          (t.members || []).map((m: any) => this.toSafeObjectId(m)),
        ).filter(Boolean);

        if (teamMemberIds.length > 0) {
          const extraUsers = await this.userModel
            .find({ _id: { $in: teamMemberIds }, isActive: { $ne: false } })
            .select('_id firstName lastName email role teamId reportsTo isActive')
            .lean();

          allUsers = [...allUsers, ...extraUsers];
        }
      }

      // 2. Build parent -> children map and identify root pages
      const allPageIds = new Set(allPages.map((p: any) => p._id.toString()));
      const childrenByParent = new Map<string, any[]>();
      const rootPages: any[] = [];

      allPages.forEach((p: any) => {
        const parentId = p.parentPageId ? p.parentPageId.toString() : null;
        if (parentId && allPageIds.has(parentId)) {
          if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
          childrenByParent.get(parentId)!.push(p);
        } else {
          rootPages.push(p);
        }
      });

      // Cycle-safe children attachment
      const attachChildren = (page: any, visited = new Set<string>()): any => {
        const pId = page._id?.toString();
        if (!pId || visited.has(pId)) return { ...page, id: pId, children: [] };
        visited.add(pId);
        const children = (childrenByParent.get(pId) || []).map((c) =>
          attachChildren(c, new Set(visited)),
        );
        return {
          ...page,
          id: page._id?.toString(),
          children,
        };
      };

      const hydratedRootPages = rootPages.map((p) => attachChildren(p));

      // 3. Map pages by assignedMemberId and by teamId
      const pagesByAssignedMember = new Map<string, any[]>();
      const genericPagesByTeam = new Map<string, any[]>();
      const standalonePages: any[] = [];

      hydratedRootPages.forEach((p) => {
        if (p.section === 'PRIVATE' || p.section === 'WORKSPACE') return;

        if (p.assignedMemberId) {
          const uid = p.assignedMemberId.toString();
          if (!pagesByAssignedMember.has(uid)) pagesByAssignedMember.set(uid, []);
          pagesByAssignedMember.get(uid)!.push(p);
        } else if (p.teamId) {
          const tid = p.teamId.toString();
          if (!genericPagesByTeam.has(tid)) genericPagesByTeam.set(tid, []);
          genericPagesByTeam.get(tid)!.push(p);
        } else {
          standalonePages.push(p);
        }
      });

      // Deduplicate users
      const userMap = new Map<string, any>();
      allUsers.forEach((u: any) => userMap.set(u._id.toString(), u));
      allUsers = Array.from(userMap.values());

      // 5. Build team folder nodes
      const placedPageIds = new Set<string>();

      const teamFolders = activeTeams.map((team: any) => {
        const teamIdStr = team._id.toString();
        const teamMemberStrIds = (team.members || []).map((m: any) => m.toString());

        const teamMembers = allUsers.filter((u: any) => {
          const uId = u._id.toString();
          const matchesTeamId = u.teamId?.toString() === teamIdStr;
          const matchesMembers = teamMemberStrIds.includes(uId);
          return matchesTeamId || matchesMembers;
        });

        const memberNodes = teamMembers.map((u: any) => {
          const userIdStr = u._id.toString();
          const roleLabel =
            u.role === 'MANAGER'
              ? 'Manager'
              : ['TEAM_LEADER', 'TL', 'LEADER'].includes(this.normalizeRole(u.role))
              ? 'TL'
              : 'Member';

          const userPages = pagesByAssignedMember.get(userIdStr) || [];
          userPages.forEach((p: any) => {
            if (p._id) placedPageIds.add(p._id.toString());
          });

          return {
            _id: `user_${userIdStr}`,
            id: `user_${userIdStr}`,
            title: `${u.firstName} ${u.lastName} (${roleLabel})`,
            pageType: 'PAGE',
            section: 'SHARED',
            children: userPages,
          };
        });

        const genericPages = genericPagesByTeam.get(teamIdStr) || [];
        const visibleGenericPages = isAdmin || isManager || isTeamLeader
          ? genericPages
          : genericPages.filter((p: any) => p.createdBy?.toString() === userStr);

        visibleGenericPages.forEach((p: any) => {
          if (p._id) placedPageIds.add(p._id.toString());
        });

        return {
          _id: teamIdStr,
          id: teamIdStr,
          title: team.name,
          pageType: 'PAGE',
          section: 'SHARED',
          children: [...memberNodes, ...visibleGenericPages],
        };
      });

      // 6. Any unplaced pages that belong to the user or are accessible
      const extraSharedPages: any[] = [];

      hydratedRootPages.forEach((p) => {
        if (p.section === 'PRIVATE' || p.section === 'WORKSPACE') return;
        const pid = p._id?.toString() || '';
        if (placedPageIds.has(pid)) return;

        if (isAdmin) {
          // Admin sees all remaining shared pages
          extraSharedPages.push(p);
        } else if (userStr) {
          // Non-admin sees their assigned, created, or shared pages
          const isAssigned = p.assignedMemberId?.toString() === userStr;
          const isCreator = p.createdBy?.toString() === userStr;
          const isSharedWith = Array.isArray(p.sharedWith) && p.sharedWith.some((id: any) => id?.toString() === userStr);
          if (isAssigned || isCreator || isSharedWith) {
            extraSharedPages.push(p);
          }
        }
      });

      // 7. Private and Workspace sections
      const privatePages = hydratedRootPages.filter(
        (p) =>
          p.section === 'PRIVATE' &&
          (isAdmin || p.createdBy?.toString() === userStr),
      );

      const workspacePages = hydratedRootPages.filter(
        (p) =>
          p.section === 'WORKSPACE' &&
          (isAdmin || p.createdBy?.toString() === userStr || p.assignedMemberId?.toString() === userStr),
      );

      const result = {
        shared: [...teamFolders, ...extraSharedPages],
        private: privatePages,
        workspace: workspacePages,
      };

      // Store in in-memory cache for subsequent instant loads
      this.treeCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (err) {
      console.error('[getTree] Error generating page tree:', err);
      const fallbackPages = await this.pageModel
        .find({ isDeleted: { $ne: true } })
        .select('title pageType section assignedMemberId teamId')
        .lean()
        .catch(() => []);

      return {
        shared: fallbackPages.filter((p: any) => p.section !== 'PRIVATE' && p.section !== 'WORKSPACE'),
        private: fallbackPages.filter((p: any) => p.section === 'PRIVATE'),
        workspace: fallbackPages.filter((p: any) => p.section === 'WORKSPACE'),
      };
    }
  }

  private async buildTeamRootNode(team: any, user: any, role: string) {
    const rawRole = this.normalizeRole(role);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(rawRole);
    const isManager = rawRole === 'MANAGER';
    const isTeamLeader = ['TEAM_LEADER', 'TL', 'LEADER'].includes(rawRole);

    const teamIdStr = team._id.toString();
    const teamObjId = this.toSafeObjectId(team._id);
    const userObjId = this.toSafeObjectId(user?._id);

    const teamPages = await this.pageModel
      .find({
        teamId: (teamObjId || team._id) as any,
        isDeleted: { $ne: true },
        $or: [{ parentPageId: null }, { parentPageId: { $exists: false } }],
      })
      .select('-rows -content')
      .lean();

    let teamUsers: any[] = [];
    if (isAdmin || isManager) {
      teamUsers = await this.userModel
        .find({
          isActive: { $ne: false },
          $or: [
            ...(teamObjId ? [{ teamId: teamObjId }] : []),
            ...((team.members || []).map((m: any) => ({ _id: this.toSafeObjectId(m) }))),
          ],
        })
        .lean();
    } else if (isTeamLeader) {
      teamUsers = await this.userModel
        .find({
          isActive: { $ne: false },
          $or: [
            ...(userObjId ? [{ reportsTo: userObjId }] : []),
            ...(teamObjId ? [{ teamId: teamObjId }] : []),
            ...(userObjId ? [{ _id: userObjId }] : []),
            ...((team.members || []).map((m: any) => ({ _id: this.toSafeObjectId(m) }))),
          ],
        })
        .lean();
    } else {
      teamUsers = userObjId
        ? await this.userModel
            .find({
              isActive: { $ne: false },
              _id: userObjId,
            })
            .lean()
        : [];
    }

    const userMap = new Map<string, any>();
    teamUsers.forEach((u) => userMap.set(u._id.toString(), u));
    teamUsers = Array.from(userMap.values());

    const memberNodes = teamUsers.map((u) => {
      const userIdStr = u._id.toString();
      const roleLabel =
        u.role === 'MANAGER'
          ? 'Manager'
          : ['TEAM_LEADER', 'TL', 'LEADER'].includes(this.normalizeRole(u.role))
          ? 'TL'
          : 'Member';

      return {
        _id: `user_${userIdStr}`,
        id: `user_${userIdStr}`,
        title: `${u.firstName} ${u.lastName} (${roleLabel})`,
        pageType: 'PAGE',
        section: 'SHARED',
        children: teamPages.filter(
          (p) => p.assignedMemberId?.toString() === userIdStr,
        ),
      };
    });

    const genericPages =
      isAdmin || isManager || isTeamLeader
        ? teamPages.filter((p) => !p.assignedMemberId)
        : [];

    return {
      _id: teamIdStr,
      id: teamIdStr,
      title: team.name,
      pageType: 'PAGE',
      section: 'SHARED',
      rows: [],
      columns: [],
      children: [...memberNodes, ...genericPages],
    };
  }

  async getPageById(id: string, user: any) {
    const rawRole = this.normalizeRole(user?.role);
    const userStr = user?._id ? user._id.toString() : '';

    if (id.startsWith('user_')) {
      const userId = id.replace('user_', '');

      if (!['SUPER_ADMIN', 'ADMIN'].includes(rawRole)) {
        if (userId !== userStr) {
          const targetUser = await this.userModel.findById(userId).lean();
          if (!targetUser) {
            throw new NotFoundException('User not found');
          }

          if (rawRole === 'MANAGER') {
            const hasAccess =
              targetUser.teamId?.toString() === user?.teamId?.toString() ||
              (await this.teamModel.exists({
                _id: this.toSafeObjectId(targetUser.teamId),
                isActive: { $ne: false },
                $or: [{ managerId: this.toSafeObjectId(userStr) }, { members: this.toSafeObjectId(userStr) }],
              }));

            if (!hasAccess) {
              throw new ForbiddenException('Not allowed to view this folder');
            }
          } else if (['TEAM_LEADER', 'TL', 'LEADER'].includes(rawRole)) {
            const hasAccess =
              targetUser.reportsTo?.toString() === userStr ||
              targetUser.teamId?.toString() === user?.teamId?.toString() ||
              (await this.teamModel.exists({
                _id: this.toSafeObjectId(targetUser.teamId),
                isActive: { $ne: false },
                members: this.toSafeObjectId(userStr),
              }));

            if (!hasAccess) {
              throw new ForbiddenException('Not allowed to view this folder');
            }
          } else {
            throw new ForbiddenException('Not allowed to view this folder');
          }
        }
      }

      const targetUser = await this.userModel.findById(userId).lean();
      if (!targetUser) throw new NotFoundException('User not found');

      const userPages = await this.pageModel
        .find({
          assignedMemberId: this.toSafeObjectId(userId) as any,
          parentPageId: null,
          isDeleted: { $ne: true },
        })
        .select('-rows -content')
        .lean();

      return {
        _id: id,
        id: id,
        title: `${targetUser.firstName} ${targetUser.lastName}`,
        pageType: 'PAGE',
        section: 'SHARED',
        rows: [],
        columns: [],
        children: userPages,
      };
    }

    if (Types.ObjectId.isValid(id)) {
      const team = await this.teamModel.findById(id).lean();
      if (team) {
        if (!['SUPER_ADMIN', 'ADMIN'].includes(rawRole)) {
          const isMyTeam =
            user?.teamId?.toString() === id ||
            team.managerId?.toString() === userStr ||
            team.members?.some((m: any) => m.toString() === userStr);

          if (!isMyTeam) {
            throw new ForbiddenException(
              'Not allowed to view this team folder',
            );
          }
        }
        return this.buildTeamRootNode(team, user, user?.role);
      }
    }

    const page = await this.pageModel
      .findById(id)
      .populate('assignmentLogs.assignedTo', 'firstName lastName')
      .populate('assignmentLogs.assignedBy', 'firstName lastName')
      .populate('updateLogs.updatedBy', 'firstName lastName')
      .lean();
    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess)
      throw new ForbiddenException('You do not have access to this page');

    const children = await this.pageModel
      .find({ parentPageId: this.toSafeObjectId(id) as any, isDeleted: { $ne: true } })
      .select('-rows -content')
      .lean();
    return {
      ...page,
      rows: Array.isArray(page.rows) ? page.rows : [],
      columns: Array.isArray(page.columns) ? page.columns : [],
      children: Array.isArray(children) ? children : [],
    };
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
    if (!hasAccess)
      throw new ForbiddenException(
        'You do not have access to update this page',
      );

    if (
      updateData.assignedMemberId &&
      updateData.assignedMemberId !== page.assignedMemberId?.toString()
    ) {
      const role = user.role?.toUpperCase();
      if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        if (role === 'MANAGER') {
          const targetUser = await this.userModel
            .findById(updateData.assignedMemberId)
            .lean();
          if (
            !targetUser ||
            targetUser.teamId?.toString() !== user.teamId?.toString()
          ) {
            throw new ForbiddenException(
              'Can only assign to your team members',
            );
          }
        } else if (role === 'TEAM_LEADER') {
          const targetUser = await this.userModel
            .findById(updateData.assignedMemberId)
            .lean();
          if (
            !targetUser ||
            targetUser.reportsTo?.toString() !== user._id.toString()
          ) {
            throw new ForbiddenException(
              'Can only assign to your direct reports',
            );
          }
        } else {
          throw new ForbiddenException('Not allowed to reassign this page');
        }
      }
    }

    const pushUpdate: any = {};
    const pushObj: any = {};

    if (
      updateData.assignedMemberId &&
      updateData.assignedMemberId !== page.assignedMemberId?.toString()
    ) {
      pushObj.assignmentLogs = {
        assignedTo: new Types.ObjectId(updateData.assignedMemberId),
        assignedBy: user._id,
        assignedAt: new Date(),
      };
    }

    if (updateData.rows || updateData.columns) {
      pushObj.updateLogs = {
        updatedBy: user._id,
        updatedAt: new Date(),
        action: 'Updated sheet data',
      };
    } else if (updateData.content) {
      pushObj.updateLogs = {
        updatedBy: user._id,
        updatedAt: new Date(),
        action: 'Updated document content',
      };
    }

    if (Object.keys(pushObj).length > 0) {
      pushUpdate.$push = pushObj;
    }

    const updatedPage = await this.pageModel
      .findByIdAndUpdate(id, { ...updateData, ...pushUpdate }, { new: true })
      .populate('assignmentLogs.assignedTo', 'firstName lastName')
      .populate('assignmentLogs.assignedBy', 'firstName lastName')
      .populate('updateLogs.updatedBy', 'firstName lastName');

    if (!updatedPage) {
      throw new NotFoundException('Page not found');
    }

    if (
      updateData.assignedMemberId &&
      updateData.assignedMemberId !== page.assignedMemberId?.toString()
    ) {
      await this.notificationsService.createNotification({
        recipient: updateData.assignedMemberId,
        title: 'New Page Assigned',
        message: `You have been assigned to the page "${updatedPage.title}" by ${user.firstName} ${user.lastName}.`,
        type: 'PAGE_ASSIGNED',
        relatedPageId: id,
      });

      // Fetch assignee to get email
      const assignee = await this.userModel
        .findById(updateData.assignedMemberId)
        .lean();
      if (assignee && assignee.email) {
        this.mailService
          .sendPageAssignmentEmail(
            assignee.email,
            `${assignee.firstName} ${assignee.lastName}`,
            updatedPage.title,
            id,
          )
          .catch((e) => console.error('Mail error:', e));
      }
    }

    this.invalidateCache();
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
      deletedAt: new Date(),
    });
    this.invalidateCache();
    return { success: true };
  }

  async getActivityLog(id: string, user: any) {
    if (id.startsWith('user_') || !Types.ObjectId.isValid(id)) {
      return { logs: [] };
    }

    const page = await this.pageModel
      .findById(id)
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
    for (const al of page.assignmentLogs || []) {
      logs.push({
        type: 'ASSIGNED',
        action: `Page assigned`,
        actor: al.assignedBy,
        target: al.assignedTo,
        timestamp: al.assignedAt,
      });
    }

    // Update logs
    for (const ul of page.updateLogs || []) {
      logs.push({
        type: 'UPDATED',
        action: ul.action || 'Page updated',
        actor: ul.updatedBy,
        timestamp: ul.updatedAt,
      });
    }

    // Sort by timestamp descending (newest first)
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return { logs, page: { _id: page._id, title: page.title } };
  }

  async getDeletedPages(user: any) {
    const role = user.role?.toUpperCase();
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      throw new ForbiddenException('Only admins can view deleted pages');
    }
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    return this.pageModel
      .find({
        isDeleted: true,
        deletedAt: { $gte: fortyFiveDaysAgo },
      })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email teamId',
        populate: { path: 'teamId', select: 'name' },
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
      $unset: { deletedBy: 1, deletedAt: 1 },
    });
    this.invalidateCache();
    return { success: true };
  }

  @Cron('0 0 * * *') // Run every day at midnight
  async purgeExpiredTrash() {
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

    await this.pageModel.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: fortyFiveDaysAgo },
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
            action: 'Cleared sheet data',
          },
        },
      },
      { new: true },
    );
    this.invalidateRemarksCache();
    return updatedPage;
  }

  async shareEmail(pageId: string, email: string) {
    const token = 'mock_token_123_' + Date.now();

    // Dispatch real email using MailService
    this.mailService
      .sendPageInviteEmail(email, token)
      .catch((e) => console.error('Invite Mail error:', e));

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
      rows: [], // clone format, not data
    });

    return clone.save();
  }

  async updateRowField(
    id: string,
    body: { rowIndex?: number; rowId?: string; field: string; value: any },
    user: any,
  ) {
    if (!id || !body.field) {
      throw new BadRequestException('Invalid page ID or field');
    }

    const page = await this.pageModel.findById(id).lean();
    if (!page) throw new NotFoundException('Page not found');

    const hasAccess = await this.checkAccess(page, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to update this page');
    }

    let updated = false;
    if (body.rowId) {
      const res = await this.pageModel.updateOne(
        { _id: id, 'rows.id': body.rowId },
        { $set: { [`rows.$.${body.field}`]: body.value } },
      );
      if (res.matchedCount > 0) updated = true;
    }

    if (!updated && typeof body.rowIndex === 'number' && body.rowIndex >= 0) {
      const res = await this.pageModel.updateOne(
        { _id: id },
        { $set: { [`rows.${body.rowIndex}.${body.field}`]: body.value } },
      );
      if (res.matchedCount > 0) updated = true;
    }

    if (!updated) {
      // Fallback: If neither rowId nor valid rowIndex worked directly, do in-memory update
      const fullPage = await this.pageModel.findById(id);
      if (fullPage && Array.isArray(fullPage.rows)) {
        let foundIdx = -1;
        if (body.rowId) {
          foundIdx = fullPage.rows.findIndex(
            (r: any) => r && (r.id === body.rowId || r._id?.toString() === body.rowId),
          );
        }
        if (foundIdx === -1 && typeof body.rowIndex === 'number' && body.rowIndex >= 0 && body.rowIndex < fullPage.rows.length) {
          foundIdx = body.rowIndex;
        }

        if (foundIdx !== -1) {
          const rowObj = fullPage.rows[foundIdx] || {};
          rowObj[body.field] = body.value;
          fullPage.rows[foundIdx] = rowObj;
          fullPage.markModified('rows');
          await fullPage.save();
          updated = true;
        }
      }
    }

    if (!updated) {
      throw new BadRequestException('Either valid rowId or rowIndex must be provided');
    }

    this.invalidateRemarksCache();
    return { success: true, field: body.field, value: body.value };
  }

  async getAllRemarks(
    user: any,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      team?: string;
      sentiment?: string;
    },
  ) {
    const rawRole = this.normalizeRole(user?.role);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(rawRole);
    const isManager = rawRole === 'MANAGER';
    const isTeamLeader = ['TEAM_LEADER', 'TL', 'LEADER'].includes(rawRole);

    const userObjId = this.toSafeObjectId(user?._id);
    const userTeamObjId = this.toSafeObjectId(user?.teamId);

    // Build filter based on role so any authenticated staff member can view remarks safely
    const pageFilter: any = { isDeleted: { $ne: true }, pageType: 'SHEET' };

    if (!isAdmin) {
      if (isManager && (userObjId || userTeamObjId)) {
        const managedTeams = await this.teamModel.find({
          isActive: { $ne: false },
          $or: [
            ...(userObjId ? [{ managerId: userObjId }, { members: userObjId }] : []),
            ...(userTeamObjId ? [{ _id: userTeamObjId }] : []),
          ],
        }).select('_id').lean();
        const teamIds = managedTeams.map((t) => t._id);
        pageFilter.$or = [
          { teamId: { $in: teamIds } },
          { assignedMemberId: userObjId },
          { createdBy: userObjId },
        ];
      } else if (isTeamLeader && (userObjId || userTeamObjId)) {
        pageFilter.$or = [
          ...(userTeamObjId ? [{ teamId: userTeamObjId }] : []),
          { assignedMemberId: userObjId },
          { createdBy: userObjId },
        ];
      } else if (userObjId) {
        pageFilter.$or = [
          { assignedMemberId: userObjId },
          { createdBy: userObjId },
          ...(userTeamObjId ? [{ teamId: userTeamObjId }] : []),
        ];
      }
    }

    const cacheKey = isAdmin ? 'ALL' : `${rawRole}_${user?._id || 'anon'}`;
    const cached = this.remarksCacheMap.get(cacheKey);
    const now = Date.now();
    let result: any[];

    if (cached && now - cached.timestamp < this.REMARKS_CACHE_TTL) {
      result = cached.data;
    } else {
      // ---- PERFORMANCE FIX: Fetch pages WITHOUT rows first (rows can be huge) ----
      // We use aggregation to process rows on the DB side, never loading full rows into Node.js RAM
      const REMARK_KEYWORDS = ['remark', 'feedback', 'comment', 'note', 'disposition'];

      const pages = await this.pageModel
        .find(pageFilter)
        .select('title columns createdAt teamId assignedMemberId')
        .populate('teamId', 'name')
        .populate('assignedMemberId', 'firstName lastName')
        .lean();

      // Build result with per-page row stats using a lightweight aggregation
      result = await Promise.all(
        (pages || []).map(async (page: any) => {
          if (!page) return null;
          const teamObj: any = page.teamId;
          const memberObj: any = page.assignedMemberId;
          const teamName = teamObj?.name || 'Unassigned';
          const assignedTo = memberObj
            ? `${memberObj.firstName || ''} ${memberObj.lastName || ''}`.trim() || 'Unassigned'
            : 'Unassigned';

          // Build column key → name map
          const colMap: Record<string, string> = {};
          if (Array.isArray(page.columns)) {
            page.columns.forEach((col: any) => {
              if (col && col.key) colMap[col.key] = col.name || col.key;
            });
          }

          // Identify remark column keys from column definitions
          const remarkKeys = Object.entries(colMap)
            .filter(([, name]) => {
              const n = String(name || '').toLowerCase();
              return REMARK_KEYWORDS.some((kw) => n.includes(kw));
            })
            .map(([key]) => key);

          // Also add raw keys that look like remarks (from column names themselves)
          Object.keys(colMap).forEach((k) => {
            const kl = k.toLowerCase();
            if (REMARK_KEYWORDS.some((kw) => kl.includes(kw)) && !remarkKeys.includes(k)) {
              remarkKeys.push(k);
            }
          });
          // Always include disposition
          if (!remarkKeys.includes('disposition')) remarkKeys.push('disposition');

          // Aggregation: count totalRows, remarksFilled, remarksEmpty for this page
          // Fetch only rows that have at least one remark field set (limit 50)
          const pageObjId = this.toSafeObjectId(page._id);
          const agg = await this.pageModel.aggregate([
            { $match: { _id: pageObjId } },
            { $project: { rows: 1 } },
            { $unwind: { path: '$rows', preserveNullAndEmptyArrays: false } },
            {
              $addFields: {
                hasRemark: {
                  $or: remarkKeys.map((k) => ({
                    $and: [
                      { $ne: [`$rows.${k}`, null] },
                      { $ne: [`$rows.${k}`, ''] },
                      { $ne: [`$rows.${k}`, undefined] },
                    ],
                  })),
                },
              },
            },
            {
              $group: {
                _id: null,
                totalRows: { $sum: 1 },
                remarksFilled: { $sum: { $cond: ['$hasRemark', 1, 0] } },
                remarksEmpty: { $sum: { $cond: ['$hasRemark', 0, 1] } },
                // Collect only rows with remarks, limit 50
                remarkRows: {
                  $push: {
                    $cond: [
                      '$hasRemark',
                      '$rows',
                      '$$REMOVE',
                    ],
                  },
                },
              },
            },
            {
              $project: {
                totalRows: 1,
                remarksFilled: 1,
                remarksEmpty: 1,
                remarkRows: { $slice: ['$remarkRows', -50] },
              },
            },
          ]).exec().catch(() => []);

          const stats = agg[0] || { totalRows: 0, remarksFilled: 0, remarksEmpty: 0, remarkRows: [] };

          // Map remark rows to human-readable objects
          const mappedRows = (stats.remarkRows || []).map((row: any) => {
            const readable: Record<string, any> = { _rowId: String(row.id || '') };
            Object.entries(row).forEach(([key, value]) => {
              if (key === 'id') return;
              if (key === 'disposition') { readable.disposition = value; return; }
              if (key === 'feedback_notes') { readable.feedback_notes = value; return; }
              readable[colMap[key] || key] = value;
            });
            return readable;
          });

          return {
            _id: page._id ? page._id.toString() : String(page._id),
            title: page.title || 'Untitled Sheet',
            teamName,
            assignedTo,
            createdAt: page.createdAt,
            columns: Array.isArray(page.columns) ? page.columns : [],
            columnNames: Object.values(colMap),
            remarkColumnNames: remarkKeys.map((k) => colMap[k] || k),
            totalRows: stats.totalRows,
            remarksFilled: stats.remarksFilled,
            remarksEmpty: stats.remarksEmpty,
            rows: mappedRows,
          };
        }),
      ).then((arr) => arr.filter(Boolean) as any[]);

      this.remarksCacheMap.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    // If options with page or limit are provided, return structured pagination
    if (options && (options.page !== undefined || options.limit !== undefined)) {
      let filtered = [...result];
      if (options.team && options.team !== 'All') {
        filtered = filtered.filter((p) => p.teamName === options.team);
      }
      if (options.search) {
        const s = options.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            (p.title && p.title.toLowerCase().includes(s)) ||
            (p.teamName && p.teamName.toLowerCase().includes(s)) ||
            (p.assignedTo && p.assignedTo.toLowerCase().includes(s)),
        );
      }
      const page = Math.max(1, options.page || 1);
      const limit = Math.max(1, options.limit || 15);
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginatedPages = filtered.slice((page - 1) * limit, page * limit);

      return {
        data: paginatedPages,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }

    return result;
  }

  async getDashboardStats(user: any) {
    const role = user.role?.toUpperCase() || 'EMPLOYEE';
    const userId = user._id ? user._id.toString() : user.id?.toString();

    // --- PERFORMANCE: Use aggregation to count rows on DB side, never load rows into Node.js RAM ---
    const REMARK_COLS = ['remark', 'feedback', 'comment', 'note', 'status', 'disposition', 'feedback_notes'];

    // For a set of sheet ObjectIds, return { sheetId -> { total, filled, empty } } via aggregation
    const aggregateSheetStats = async (sheetIds: any[]): Promise<Record<string, { total: number; filled: number; empty: number }>> => {
      if (!sheetIds.length) return {};
      const safeIds = sheetIds.map((id) => this.toSafeObjectId(id)).filter(Boolean);
      if (!safeIds.length) return {};

      // Build $or for hasRemark: check if any field whose key contains a remark keyword has a truthy value
      // We use $objectToArray so we don't need to know column keys upfront
      const agg = await this.pageModel.aggregate([
        { $match: { _id: { $in: safeIds } } },
        { $project: { rows: 1 } },
        { $unwind: { path: '$rows', preserveNullAndEmptyArrays: false } },
        {
          $addFields: {
            rowPairs: { $objectToArray: '$rows' },
          },
        },
        {
          $addFields: {
            hasRemark: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: '$rowPairs',
                      as: 'pair',
                      cond: {
                        $and: [
                          {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: REMARK_COLS,
                                    as: 'kw',
                                    cond: { $ne: [{ $indexOfCP: ['$$pair.k', '$$kw'] }, -1] },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          { $ne: ['$$pair.v', ''] },
                          { $ne: ['$$pair.v', null] },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$_id',
            total: { $sum: 1 },
            filled: { $sum: { $cond: ['$hasRemark', 1, 0] } },
            empty: { $sum: { $cond: ['$hasRemark', 0, 1] } },
          },
        },
      ]).exec().catch(() => []);

      const map: Record<string, { total: number; filled: number; empty: number }> = {};
      (agg || []).forEach((r: any) => {
        if (r._id) map[r._id.toString()] = { total: r.total || 0, filled: r.filled || 0, empty: r.empty || 0 };
      });
      return map;
    };

    if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      const [allTeams, allUsers, allSheets] = await Promise.all([
        this.teamModel.find({ isActive: true }).select('name').lean(),
        this.userModel
          .find({ isActive: true, role: { $nin: ['SUPER_ADMIN', 'ADMIN'] } })
          .select('firstName lastName email role teamId')
          .lean(),
        // NO rows field — only metadata
        this.pageModel
          .find({ isDeleted: { $ne: true }, pageType: 'SHEET' })
          .select('title teamId assignedMemberId columns createdAt')
          .lean(),
      ]);

      const teamMap: Record<string, any> = {};
      allTeams.forEach((t) => {
        teamMap[t._id.toString()] = {
          teamId: t._id,
          teamName: t.name,
          sheetsCount: 0,
          totalLeads: 0,
          remarksFilled: 0,
          remarksEmpty: 0,
        };
      });
      teamMap['unassigned'] = {
        teamId: null,
        teamName: 'General / Unassigned',
        sheetsCount: 0,
        totalLeads: 0,
        remarksFilled: 0,
        remarksEmpty: 0,
      };

      const memberMap: Record<string, any> = {};
      allUsers.forEach((u: any) => {
        memberMap[u._id.toString()] = {
          memberId: u._id,
          name: `${u.firstName} ${u.lastName || ''}`.trim(),
          role: u.role,
          sheetsCount: 0,
          totalLeads: 0,
          remarksFilled: 0,
          remarksEmpty: 0,
        };
      });

      let grandTotalSheets = 0;
      let grandTotalLeads = 0;
      let grandTotalFilled = 0;
      let grandTotalEmpty = 0;

      // Aggregate stats for all sheets in one DB call (no rows in RAM)
      const sheetIds = allSheets.map((s) => s._id);
      const statsMap = await aggregateSheetStats(sheetIds);

      allSheets.forEach((sheet) => {
        const sid = sheet._id.toString();
        const { total, filled, empty } = statsMap[sid] || { total: 0, filled: 0, empty: 0 };
        grandTotalSheets++;
        grandTotalLeads += total;
        grandTotalFilled += filled;
        grandTotalEmpty += empty;

        const tid = sheet.teamId ? sheet.teamId.toString() : 'unassigned';
        if (!teamMap[tid]) {
          teamMap[tid] = {
            teamId: sheet.teamId,
            teamName: 'Other Team',
            sheetsCount: 0,
            totalLeads: 0,
            remarksFilled: 0,
            remarksEmpty: 0,
          };
        }
        teamMap[tid].sheetsCount++;
        teamMap[tid].totalLeads += total;
        teamMap[tid].remarksFilled += filled;
        teamMap[tid].remarksEmpty += empty;

        if (sheet.assignedMemberId) {
          const mid = sheet.assignedMemberId.toString();
          if (memberMap[mid]) {
            memberMap[mid].sheetsCount++;
            memberMap[mid].totalLeads += total;
            memberMap[mid].remarksFilled += filled;
            memberMap[mid].remarksEmpty += empty;
          }
        }
      });

      return {
        role: 'ADMIN',
        summary: {
          totalSheets: grandTotalSheets,
          totalLeads: grandTotalLeads,
          remarksFilled: grandTotalFilled,
          remarksEmpty: grandTotalEmpty,
        },
        teams: Object.values(teamMap).filter((t: any) => t.sheetsCount > 0),
        members: Object.values(memberMap)
          .filter((m: any) => m.sheetsCount > 0)
          .sort((a: any, b: any) => b.totalLeads - a.totalLeads),
      };
    }

    if (['MANAGER', 'TEAM_LEADER'].includes(role)) {

      let teamId = user.teamId;
      let teamMembers: any[] = [];
      const userObjId = user._id ? (typeof user._id === 'string' ? new Types.ObjectId(user._id) : user._id) : null;

      if (role === 'TEAM_LEADER') {
        // Strictly only direct reports assigned to this Team Leader
        teamMembers = await this.userModel
          .find({
            reportsTo: { $in: [user._id, userObjId].filter(Boolean) },
            isActive: true,
          })
          .select('firstName lastName email role')
          .lean();
      } else {
        const managedTeams = await this.teamModel
          .find({
            isActive: true,
            $or: [
              { managerId: { $in: [user._id, userObjId].filter(Boolean) } },
              { members: { $in: [user._id, userObjId].filter(Boolean) } },
            ],
          })
          .lean();
        const teamIds = managedTeams.map((t) => t._id);
        if (teamId && !teamIds.some((id) => id.toString() === teamId.toString())) {
          teamIds.push(teamId);
        }
        teamMembers = await this.userModel
          .find({ teamId: { $in: teamIds }, isActive: true })
          .select('firstName lastName email role')
          .lean();
      }

      const memberIds = teamMembers.map((m) => m._id);
      const allScopedIds = [
        user._id,
        ...(userObjId ? [userObjId] : []),
        ...memberIds,
      ];

      // Sheets belonging strictly to this group:
      // Manager can see all teamId sheets, but Team Leader only sees sheets of their direct reports + self
      const queryCond: any = {
        isDeleted: { $ne: true },
        pageType: 'SHEET',
        $or: [
          ...(role === 'MANAGER' && teamId ? [{ teamId }] : []),
          { assignedMemberId: { $in: allScopedIds } },
          { createdBy: user._id },
        ],
      };

      const sheets = await this.pageModel
        .find(queryCond)
        .select('title teamId assignedMemberId columns createdAt')
        .lean();

      let teamSheets = 0;
      let totalLeads = 0;
      let remarksFilled = 0;
      let remarksEmpty = 0;

      const memberStatsMap: Record<string, any> = {};
      teamMembers.forEach((m) => {
        memberStatsMap[m._id.toString()] = {
          memberId: m._id,
          name: `${m.firstName} ${m.lastName || ''}`.trim(),
          role: m.role,
          sheetsCount: 0,
          totalLeads: 0,
          remarksFilled: 0,
          remarksEmpty: 0,
        };
      });

      // Aggregate stats for manager/TL sheets in one DB call
      const sheetIds2 = sheets.map((s) => s._id);
      const statsMap2 = await aggregateSheetStats(sheetIds2);

      sheets.forEach((sheet) => {
        const sid = sheet._id.toString();
        const { total, filled, empty } = statsMap2[sid] || { total: 0, filled: 0, empty: 0 };
        teamSheets++;
        totalLeads += total;
        remarksFilled += filled;
        remarksEmpty += empty;

        if (sheet.assignedMemberId) {
          const mid = sheet.assignedMemberId.toString();
          if (memberStatsMap[mid]) {
            memberStatsMap[mid].sheetsCount++;
            memberStatsMap[mid].totalLeads += total;
            memberStatsMap[mid].remarksFilled += filled;
            memberStatsMap[mid].remarksEmpty += empty;
          }
        }
      });

      let teamName = 'My Team';
      if (role === 'TEAM_LEADER') {
        teamName = `${user.firstName || 'Team Leader'} Team`;
      } else if (teamId) {
        const t = await this.teamModel.findById(teamId).select('name').lean();
        if (t) teamName = t.name;
      }

      return {
        role,
        teamName,
        summary: {
          teamSheets,
          totalLeads,
          remarksFilled,
          remarksEmpty,
        },
        members: Object.values(memberStatsMap),
      };
    }

    // Default: Employee / Sourcer / Channel Partner
    const mySheets = await this.pageModel
      .find({
        isDeleted: { $ne: true },
        pageType: 'SHEET',
        $or: [
          { assignedMemberId: user._id },
          { createdBy: user._id },
          { sharedWith: user._id },
        ],
      })
      .select('title columns createdAt')
      .lean();

    let totalLeads = 0;
    let remarksFilled = 0;
    let remarksEmpty = 0;

    // Aggregate stats for employee's sheets
    const mySheetIds = mySheets.map((s) => s._id);
    const myStatsMap = await aggregateSheetStats(mySheetIds);

    const sheetList = mySheets.map((sheet: any) => {
      const { total, filled, empty } = myStatsMap[sheet._id.toString()] || { total: 0, filled: 0, empty: 0 };
      totalLeads += total;
      remarksFilled += filled;
      remarksEmpty += empty;
      return {
        _id: sheet._id,
        title: sheet.title,
        totalLeads: total,
        remarksFilled: filled,
        remarksEmpty: empty,
        createdAt: sheet.createdAt,
      };
    });

    return {
      role: 'EMPLOYEE',
      summary: {
        mySheets: mySheets.length,
        totalLeads,
        remarksFilled,
        remarksEmpty,
      },
      sheets: sheetList,
    };
  }
}
