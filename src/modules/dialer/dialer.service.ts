import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { GetCallLogsDto } from './dto/get-call-logs.dto';

export interface CallLogItem {
  log_id: string;
  camaign_id?: string;
  master_id?: string;
  map_id?: string;
  TransferredTo?: string | null;
  TransferredFrom?: string | null;
  cdr_id?: string;
  dialed_phone_no?: string;
  CallType?: string;
  Status?: string;
  NoOfAttempts?: string;
  campaign_name?: string;
  extension_no?: string | null;
  DID_No?: string | null;
  agent_name?: string | null;
  employee_code?: string | null;
  crm_duration?: string;
  Wrapup_Durn?: string | null;
  call_duration?: string | null;
  HangupCause?: string;
  crm_id?: string | null;
  start_time?: string;
  end_time?: string;
  callback_time?: string | null;
  callback_no?: string | null;
  disposition?: string | null;
  sub_disposition?: string | null;
  Transfer_To?: string | null;
  Transfer_No?: string | null;
  feedback?: string | null;
  Latitude?: string | null;
  Recording_Path?: string | null;
  Doc_Attached?: string | null;
  phone?: string;
  Customer_Name?: string;
  Location?: string;
  Remark?: string | null;
  Video?: string | null;
  meeting_id?: string | null;
}

@Injectable()
export class DialerService {
  private readonly logger = new Logger(DialerService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private getApiUrl(): string {
    return (
      process.env.DIALER_API_URL ||
      'http://192.168.1.220/crm/adminapi/getCallLogData'
    );
  }

  private getAuthToken(): string {
    return (
      process.env.DIALER_AUTH_TOKEN ||
      'NzJTQ1JCa2hEa2FKNzRMWXNzYzg5Zz09'
    );
  }

  private getProcessId(): number {
    return Number(process.env.DIALER_PROCESS_ID) || 14;
  }

  /**
   * Determine allowed dialer agent identifiers for the logged-in user based on role & team hierarchy
   */
  private async getAllowedAgentIdentifiers(
    user?: any,
  ): Promise<{
    isUnrestricted: boolean;
    identifiers: Set<string>;
    teamMembers: {
      id: string;
      name: string;
      role: string;
      employeeId?: string;
      dialerExtension?: string;
    }[];
  }> {
    if (!user) {
      return { isUnrestricted: true, identifiers: new Set(), teamMembers: [] };
    }

    const role = (user.role || '').toUpperCase();

    // Super Admin and Admin have unrestricted company-wide access to all logs
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return { isUnrestricted: true, identifiers: new Set(), teamMembers: [] };
    }

    const identifiers = new Set<string>();
    const teamMembersMap = new Map<string, any>();

    const addPersonIdentifiers = (person: any) => {
      if (!person) return;
      const id = String(person._id || person.employeeId || person.firstName);
      const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();

      if (!teamMembersMap.has(id)) {
        teamMembersMap.set(id, {
          id,
          name: fullName || person.firstName || 'Unknown',
          role: person.role || 'EMPLOYEE',
          employeeId: person.employeeId,
          dialerExtension: person.dialerExtension,
        });
      }

      if (person.dialerExtension) {
        identifiers.add(person.dialerExtension.trim().toLowerCase());
      }
      if (person.employeeId) {
        identifiers.add(person.employeeId.trim().toLowerCase());
      }
      if (fullName) {
        identifiers.add(fullName.toLowerCase());
      }
      if (person.firstName) {
        identifiers.add(person.firstName.trim().toLowerCase());
      }
      if (person.lastName) {
        identifiers.add(person.lastName.trim().toLowerCase());
      }
      if (person.phone) {
        identifiers.add(person.phone.trim().toLowerCase());
      }
    };

    // Always include current user's own identifiers
    addPersonIdentifiers(user);

    if (role === 'TEAM_LEADER') {
      // Direct reports assigned to this Team Leader
      const tlId = user._id
        ? typeof user._id === 'string'
          ? new Types.ObjectId(user._id)
          : user._id
        : null;

      const directReports = await this.userModel
        .find({
          reportsTo: { $in: [user._id, tlId].filter(Boolean) },
          isActive: true,
        })
        .select('_id firstName lastName employeeId dialerExtension phone role')
        .lean();

      directReports.forEach(addPersonIdentifiers);
    } else if (role === 'MANAGER') {
      // 1. All direct team members and Team Leaders under Manager
      const teamObjId = user.teamId
        ? typeof user.teamId === 'string'
          ? new Types.ObjectId(user.teamId)
          : user.teamId
        : null;

      const managerObjId = user._id
        ? typeof user._id === 'string'
          ? new Types.ObjectId(user._id)
          : user._id
        : null;

      const orConditions: any[] = [];
      if (teamObjId) {
        orConditions.push({ teamId: teamObjId }, { teamId: user.teamId });
      }
      if (managerObjId) {
        orConditions.push({ reportsTo: managerObjId }, { reportsTo: user._id });
      }

      const directMembers = await this.userModel
        .find({
          isActive: true,
          ...(orConditions.length > 0 ? { $or: orConditions } : {}),
        })
        .select('_id firstName lastName employeeId dialerExtension phone role')
        .lean();

      directMembers.forEach(addPersonIdentifiers);

      // 2. Also include all agents/telecallers who report to any Team Leader under this Manager
      const directIds = directMembers.map((m) => m._id);
      if (directIds.length > 0) {
        const subMembers = await this.userModel
          .find({
            isActive: true,
            reportsTo: { $in: directIds },
          })
          .select('_id firstName lastName employeeId dialerExtension phone role')
          .lean();

        subMembers.forEach(addPersonIdentifiers);
      }
    }

    return {
      isUnrestricted: false,
      identifiers,
      teamMembers: Array.from(teamMembersMap.values()),
    };
  }

  async getCallLogs(dto: GetCallLogsDto, user?: any): Promise<{
    success: boolean;
    total: number;
    data: CallLogItem[];
    teamMembers?: {
      id: string;
      name: string;
      role: string;
      employeeId?: string;
      dialerExtension?: string;
    }[];
    stats: {
      totalCalls: number;
      answeredCalls: number;
      unansweredCalls: number;
      uniqueAgents: number;
    };
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        process_id: dto.process_id || this.getProcessId(),
        report_type: dto.report_type || '',
        campaigns: dto.campaigns || '',
        agent: dto.agent || '',
        from_date: dto.from_date || `${today} 00:00:00`,
        from_date_to: dto.from_date_to || `${today} 23:59:59`,
        phone_number: dto.phone_number || '',
        limit: dto.limit || 1000,
      };

      let response: Response;
      const primaryUrl = this.getApiUrl();
      const localUrl = 'http://192.168.1.220/crm/adminapi/getCallLogData';

      try {
        response = await fetch(primaryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.getAuthToken(),
            'Bypass-Tunnel-Reminder': 'true',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok && primaryUrl !== localUrl) {
          this.logger.warn(
            `Primary dialer URL (${primaryUrl}) returned status ${response.status}. Trying local fallback (${localUrl})...`,
          );
          response = await fetch(localUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: this.getAuthToken(),
              'Bypass-Tunnel-Reminder': 'true',
            },
            body: JSON.stringify(payload),
          });
        }
      } catch (primaryErr: any) {
        if (primaryUrl !== localUrl) {
          this.logger.warn(
            `Primary dialer URL (${primaryUrl}) failed: ${primaryErr.message}. Trying local fallback (${localUrl})...`,
          );
          response = await fetch(localUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: this.getAuthToken(),
              'Bypass-Tunnel-Reminder': 'true',
            },
            body: JSON.stringify(payload),
          });
        } else {
          throw primaryErr;
        }
      }

      if (!response.ok) {
        throw new HttpException(
          `Dialer API error: ${response.status} ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const json = await response.json();
      const rawLogs: CallLogItem[] = json?.result?.allCallLog || [];

      // Role-Based Team & Hierarchy Filtering
      const { isUnrestricted, identifiers, teamMembers } =
        await this.getAllowedAgentIdentifiers(user);

      const logs = isUnrestricted
        ? rawLogs
        : rawLogs.filter((log) => {
            const emp = (log.employee_code || '').trim().toLowerCase();
            const agent = (
              log.agent_name ||
              log.extension_no ||
              ''
            )
              .trim()
              .toLowerCase();

            for (const id of identifiers) {
              if (!id) continue;
              // Exact match on extension, employee code or name
              if (emp === id || agent === id) return true;
              // Substring match for full name
              if (emp && (emp.includes(id) || id.includes(emp))) return true;
              if (agent && (agent.includes(id) || id.includes(agent))) return true;
            }
            return false;
          });

      // Calculate summary metrics for filtered logs
      let answered = 0;
      let unanswered = 0;
      const agents = new Set<string>();

      for (const log of logs) {
        const agKey = (
          log.employee_code ||
          log.agent_name ||
          log.extension_no ||
          ''
        ).trim();
        if (agKey) agents.add(agKey);
        const durationSec =
          log.call_duration || log.crm_duration || '00:00:00';
        if (durationSec !== '00:00:00' && durationSec !== '0') {
          answered++;
        } else {
          unanswered++;
        }
      }

      return {
        success: true,
        total: logs.length,
        data: logs,
        teamMembers,
        stats: {
          totalCalls: logs.length,
          answeredCalls: answered,
          unansweredCalls: unanswered,
          uniqueAgents: agents.size,
        },
      };
    } catch (err: any) {
      this.logger.error(`Error fetching call logs from dialer: ${err.message}`);
      throw new HttpException(
        err.message || 'Failed to fetch call logs from dialer',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
