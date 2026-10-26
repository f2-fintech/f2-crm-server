import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
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

  async getCallLogs(dto: GetCallLogsDto): Promise<{
    success: boolean;
    total: number;
    data: CallLogItem[];
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
        limit: dto.limit || 100,
      };

      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthToken(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new HttpException(
          `Dialer API error: ${response.status} ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const json = await response.json();
      const logs: CallLogItem[] = json?.result?.allCallLog || [];

      // Calculate quick summary metrics
      let answered = 0;
      let unanswered = 0;
      const agents = new Set<string>();

      for (const log of logs) {
        if (log.agent_name) agents.add(log.agent_name);
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
