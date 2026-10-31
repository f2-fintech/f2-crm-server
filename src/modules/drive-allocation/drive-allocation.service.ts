import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import {
  DriveRecord,
  DriveRecordDocument,
  RecordAllocationStatus,
} from './schemas/drive-record.schema';
import {
  DriveSource,
  DriveSourceDocument,
  DiscoveredDriveFile,
} from './schemas/drive-source.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Lead, LeadDocument, LeadStatus } from '../leads/schemas/lead.schema';
import {
  NotionPage,
  NotionPageDocument,
} from '../notion-pages/schemas/notion-page.schema';
import {
  DriveAllocationLog,
  DriveAllocationLogDocument,
  AllocationActionType,
} from './schemas/drive-allocation-log.schema';
import { AllocateRecordsDto, PreviewRecordsDto } from './dto/allocate-records.dto';
import { ReassignRecordsDto, ReturnRecordsDto } from './dto/drive-actions.dto';

export interface CachedRecord {
  _id: string;
  sourceFileId: string;
  sourceFileName: string;
  folderPath: string;
  rowIndex: number;
  phone: string;
  cleanPhone: string;
  customerName: string;
  branch: string;
  state: string;
  eligibilityAmount: number;
  rawData: Record<string, any>;
}

export interface CachedFileData {
  fileId: string;
  fileName: string;
  folderPath: string;
  headers: string[];
  records: CachedRecord[];
  totalRows: number;
  lastCachedAt: string;
}

@Injectable()
export class DriveAllocationService {
  private readonly logger = new Logger(DriveAllocationService.name);

  // Default initial Google Drive folder provided by user
  private readonly defaultFolderUrl =
    'https://drive.google.com/drive/folders/1MBSZMvggdJK-veLYmel8Kp-HSvywtOdj';

  private scanningPromise: Promise<DiscoveredDriveFile[]> | null = null;

  // Local disk cache folder (keeps 0 unallocated rows in MongoDB Atlas)
  private readonly cacheDir = path.join(process.cwd(), 'data', 'drive-cache');
  private readonly memoryCache = new Map<string, CachedFileData>();

  public readonly fileTrueCounts: Record<string, number> = {
    '1SWv9g0jGqXn_-uNPE3tlIFheur26cVDC35wlpUA7OwM': 562200, // NEET
    '18DLEPFJ4bK5OEe6M73fDHEGpDXWHdBNM55FcNAb5M_g': 184779, // BL
    '188z548WIVcVRKrIMkVIUecbgiPDyzvMY5Bh7jUfeO80': 71119, // LOGIN
    '19SUUu19-xgsJlJZX1lk-RfJPT3QF4iJCli0Vd6HEd_4': 30001, // Fresh Data 30k
    '1a0HUxFEIwyaQx-u1jAwI_8bFmbDBiGh1f2ZG-cSg7AU': 26422, // Tata Points Main
    '1j1ifwKr1yK4jx8AmCW9orDXJVrcUX-kzhGXK-CGrV4U': 21047, // Fresh Data 21k
    '1R8QmoTfyQiKrrQyNNRp2b8Zk-GyV-jhb1fsu2ITb3Lw': 4999, // LOT
    '1aXOBMHBffVyPlkmXAb-D9bXP1CIdjy6yJws95ogScoA': 4420, // Consolidated Directories
    '1RjhfJXnAgyGR4OW3kcJoddFZfEvTaCVrwYBdEjjDlUg': 1317, // TEAM X
    '15XUYozHyMKmDMD_alH7ZEM9-Xkzi8y4rXCSC4Z6yRwk': 521, // ICICI BANK LOGIN DATA Updated
    '1BJ5y9dC3XAz8reV_P1suHwbBzJKjwVHA4ag3yLnpwbY': 213, // MAY
    '1WKqaG8VZxRWf_jb_WDAL8-C1ae5oTjswtrvice60w_Y': 212, // Jan
  };

  constructor(
    @InjectModel(DriveRecord.name)
    private readonly driveRecordModel: Model<DriveRecordDocument>,
    @InjectModel(DriveSource.name)
    private readonly driveSourceModel: Model<DriveSourceDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    @InjectModel(NotionPage.name)
    private readonly notionPageModel: Model<NotionPageDocument>,
    @InjectModel(DriveAllocationLog.name)
    private readonly driveAllocationLogModel: Model<DriveAllocationLogDocument>,
  ) {
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      } catch (err: any) {
        this.logger.warn(`Could not create cache dir ${this.cacheDir}: ${err.message}`);
      }
    }
  }

  /**
   * Helper to count total allocated leads for a file across all batch allocation documents
   */
  async getAllocatedCount(fileId: string): Promise<number> {
    const allocations = await this.driveRecordModel
      .find({ sourceFileId: fileId, status: RecordAllocationStatus.ALLOCATED })
      .select('allocatedCount records')
      .lean();
    return allocations.reduce(
      (sum, a) => sum + (a.allocatedCount || a.records?.length || 0),
      0,
    );
  }

  /**
   * Helper to get sets of allocated row indices and phone numbers for a file
   */
  async getAllocatedIndices(fileId: string): Promise<{
    allocatedRowIndices: Set<number>;
    allocatedPhones: Set<string>;
  }> {
    const allocations = await this.driveRecordModel
      .find({ sourceFileId: fileId, status: RecordAllocationStatus.ALLOCATED })
      .select('records')
      .lean();
    const allocatedRowIndices = new Set<number>();
    const allocatedPhones = new Set<string>();
    for (const a of allocations) {
      for (const r of a.records || []) {
        if (r.rowIndex) allocatedRowIndices.add(r.rowIndex);
        if (r.cleanPhone) allocatedPhones.add(r.cleanPhone);
      }
    }
    return { allocatedRowIndices, allocatedPhones };
  }

  /**
   * Helper to parse Google Drive folder ID from link
   */
  extractFolderId(url: string): string {
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (matchId) return matchId[1];
    return url.trim();
  }

  /**
   * Get or initialize default Drive configuration
   */
  async getOrInitDriveSource(customUrl?: string): Promise<DriveSourceDocument> {
    const targetUrl = customUrl || this.defaultFolderUrl;
    const folderId = this.extractFolderId(targetUrl);

    let source = await this.driveSourceModel.findOne({ folderId });
    if (!source) {
      source = await this.driveSourceModel.findOneAndUpdate(
        { folderId },
        {
          $setOnInsert: {
            folderUrl: targetUrl,
            folderId,
            title: 'mis_search_automation',
            files: [],
            isActive: true,
          },
        },
        { upsert: true, new: true },
      );
    }
    if (!source) {
      source = await this.driveSourceModel.findOne({ folderId });
    }
    return source as DriveSourceDocument;
  }

  /**
   * Recursive scanner using embeddedfolderview to find all Google Spreadsheets
   */
  async scanDriveFolder(folderUrl?: string): Promise<DiscoveredDriveFile[]> {
    if (this.scanningPromise) {
      return await this.scanningPromise;
    }
    this.scanningPromise = this.executeScanDriveFolder(folderUrl);
    try {
      return await this.scanningPromise;
    } finally {
      this.scanningPromise = null;
    }
  }

  private async executeScanDriveFolder(
    folderUrl?: string,
  ): Promise<DiscoveredDriveFile[]> {
    const source = await this.getOrInitDriveSource(folderUrl);
    const rootId = source.folderId;

    this.logger.log(`Scanning Google Drive folder: ${rootId}`);
    const discovered: DiscoveredDriveFile[] = [];

    const fetchEmbedded = (
      id: string,
    ): Promise<Array<{ id: string; href: string; name: string }>> => {
      return new Promise((resolve) => {
        const url = `https://drive.google.com/embeddedfolderview?id=${id}`;
        https
          .get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              const entries: Array<{ id: string; href: string; name: string }> =
                [];
              const entryRegex =
                /id="entry-([^"]+)".+?<a href="([^"]+)".+?<div class="flip-entry-title">([^<]+)<\/div>/g;
              let m;
              while ((m = entryRegex.exec(data)) !== null) {
                entries.push({ id: m[1], href: m[2], name: m[3] });
              }
              resolve(entries);
            });
          })
          .on('error', (err) => {
            this.logger.error(`Error reading folder ${id}: ${err.message}`);
            resolve([]);
          });
      });
    };

    const traverse = async (
      currentId: string,
      currentPath: string,
      depth = 0,
    ) => {
      if (depth > 4) return;
      const entries = await fetchEmbedded(currentId);
      for (const entry of entries) {
        const isSheet =
          entry.href.includes('spreadsheets') ||
          entry.name.endsWith('.xlsx') ||
          entry.name.endsWith('.csv');
        const isFolder = entry.href.includes('/folders/');

        if (isSheet) {
          discovered.push({
            fileId: entry.id,
            fileName: entry.name,
            folderPath: currentPath,
            exportUrl: `https://docs.google.com/spreadsheets/d/${entry.id}/export?format=csv`,
            totalRecords: 0,
            availableRecords: 0,
            allocatedRecords: 0,
            lastSyncedAt: new Date(),
          });
        } else if (isFolder) {
          const nextPath = currentPath
            ? `${currentPath} / ${entry.name}`
            : entry.name;
          await traverse(entry.id, nextPath, depth + 1);
        }
      }
    };

    await traverse(rootId, '');

    if (discovered.length === 0) {
      this.logger.warn('Initial scan empty, populating known folders');
      const knownFiles = [
        {
          fileId: '18DLEPFJ4bK5OEe6M73fDHEGpDXWHdBNM55FcNAb5M_g',
          fileName: 'BL',
          folderPath: 'BL',
        },
        {
          fileId: '15XUYozHyMKmDMD_alH7ZEM9-Xkzi8y4rXCSC4Z6yRwk',
          fileName: 'ICICI BANK LOGIN DATA Updated',
          folderPath: 'PL',
        },
        {
          fileId: '1aXOBMHBffVyPlkmXAb-D9bXP1CIdjy6yJws95ogScoA',
          fileName: 'Consolidated Directories',
          folderPath: 'DOCTORS / Directory',
        },
        {
          fileId: '1WKqaG8VZxRWf_jb_WDAL8-C1ae5oTjswtrvice60w_Y',
          fileName: 'Jan',
          folderPath: 'DOCTORS / f2 Leads',
        },
        {
          fileId: '1BJ5y9dC3XAz8reV_P1suHwbBzJKjwVHA4ag3yLnpwbY',
          fileName: 'MAY',
          folderPath: 'DOCTORS / f2 Leads',
        },
        {
          fileId: '188z548WIVcVRKrIMkVIUecbgiPDyzvMY5Bh7jUfeO80',
          fileName: 'LOGIN',
          folderPath: 'DOCTORS / Login',
        },
        {
          fileId: '1R8QmoTfyQiKrrQyNNRp2b8Zk-GyV-jhb1fsu2ITb3Lw',
          fileName: 'LOT',
          folderPath: 'DOCTORS / lot',
        },
        {
          fileId: '1SWv9g0jGqXn_-uNPE3tlIFheur26cVDC35wlpUA7OwM',
          fileName: 'NEET',
          folderPath: 'DOCTORS / Neet',
        },
        {
          fileId: '1j1ifwKr1yK4jx8AmCW9orDXJVrcUX-kzhGXK-CGrV4U',
          fileName: 'Fresh Data 21k',
          folderPath: 'DOCTORS / Neet support data',
        },
        {
          fileId: '19SUUu19-xgsJlJZX1lk-RfJPT3QF4iJCli0Vd6HEd_4',
          fileName: 'Fresh Data 30k',
          folderPath: 'DOCTORS / Neet support data',
        },
        {
          fileId: '1a0HUxFEIwyaQx-u1jAwI_8bFmbDBiGh1f2ZG-cSg7AU',
          fileName: 'Tata Points Main',
          folderPath: 'DOCTORS / Tata Points',
        },
        {
          fileId: '1RjhfJXnAgyGR4OW3kcJoddFZfEvTaCVrwYBdEjjDlUg',
          fileName: 'TEAM X',
          folderPath: 'DOCTORS / TEAM X',
        },
      ];

      for (const kf of knownFiles) {
        discovered.push({
          fileId: kf.fileId,
          fileName: kf.fileName,
          folderPath: kf.folderPath,
          exportUrl: `https://docs.google.com/spreadsheets/d/${kf.fileId}/export?format=csv`,
          totalRecords: 0,
          availableRecords: 0,
          allocatedRecords: 0,
          lastSyncedAt: new Date(),
        });
      }
    }

    // Refresh real counts: only ALLOCATED batch documents live in MongoDB Atlas
    for (const f of discovered) {
      const allocated = await this.getAllocatedCount(f.fileId);
      const trueTotal = this.fileTrueCounts[f.fileId] || f.totalRecords || 0;
      f.totalRecords = trueTotal;
      f.allocatedRecords = allocated;
      f.availableRecords = Math.max(0, trueTotal - allocated);
    }

    await this.driveSourceModel.findByIdAndUpdate(source._id, {
      $set: {
        files: discovered,
        lastScannedAt: new Date(),
      },
    });

    return discovered;
  }

  /**
   * Get all files from Drive
   */
  async getFilesList(): Promise<DiscoveredDriveFile[]> {
    let source = await this.driveSourceModel.findOne({ isActive: true });
    if (!source || !source.files || source.files.length === 0) {
      return await this.scanDriveFolder();
    }

    for (const f of source.files) {
      const allocated = await this.getAllocatedCount(f.fileId);
      const trueTotal = Math.max(
        this.fileTrueCounts[f.fileId] || 0,
        f.totalRecords || 0,
      );

      f.totalRecords = trueTotal;
      f.allocatedRecords = allocated;
      f.availableRecords = Math.max(0, trueTotal - allocated);
    }
    return source.files;
  }

  /**
   * Helper to download CSV with redirects
   */
  private downloadCsv(url: string, maxRedirects = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      const fetchUrl = (currentUrl: string, redirectsRemaining: number) => {
        if (redirectsRemaining < 0) {
          return reject(new Error('Too many redirects while downloading sheet'));
        }

        https
          .get(currentUrl, (res) => {
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              return fetchUrl(res.headers.location, redirectsRemaining - 1);
            }
            if (res.statusCode !== 200) {
              return reject(
                new Error(`Failed to download sheet, status: ${res.statusCode}`),
              );
            }

            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
          })
          .on('error', (err) => reject(err));
      };

      fetchUrl(url, maxRedirects);
    });
  }

  /**
   * Parse simple CSV text into array of rows
   */
  private parseCsv(text: string): { headers: string[]; rows: any[] } {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      if (!line.includes('"') && !line.includes("'")) {
        return line.split(',').map((s) => s.trim());
      }
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) =>
      h.replace(/^["']|["']$/g, '').trim(),
    );
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const lineStr = lines[i]?.trim();
      if (!lineStr) continue;

      const values = parseLine(lineStr).map((v) =>
        v.replace(/^["']|["']$/g, '').trim(),
      );
      if (values.every((v) => !v)) continue;

      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }

    return { headers, rows };
  }

  /**
   * Get cached file data from memory or disk; if missing, downloads from Google Drive and caches to disk
   */
  async getFileCachedData(
    fileId: string,
    forceRefresh = false,
  ): Promise<CachedFileData> {
    if (!forceRefresh && this.memoryCache.has(fileId)) {
      return this.memoryCache.get(fileId)!;
    }

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    const cacheFilePath = path.join(this.cacheDir, `${fileId}.json`);
    if (!forceRefresh && fs.existsSync(cacheFilePath)) {
      try {
        const fileContent = fs.readFileSync(cacheFilePath, 'utf8');
        const parsed: CachedFileData = JSON.parse(fileContent);
        this.memoryCache.set(fileId, parsed);
        return parsed;
      } catch (err: any) {
        this.logger.warn(
          `Failed reading disk cache for ${fileId}: ${err.message}. Re-downloading.`,
        );
      }
    }

    // Download from Google Drive
    const files = await this.getFilesList();
    const targetFile = files.find((f) => f.fileId === fileId);
    const fileName = targetFile?.fileName || 'Drive Sheet';
    const folderPath = targetFile?.folderPath || '';

    this.logger.log(`Downloading sheet from Google Drive: ${fileName} (${fileId})`);
    const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;

    let csvData = '';
    try {
      csvData = await this.downloadCsv(exportUrl);
    } catch (err: any) {
      this.logger.error(`Download error for ${fileId}: ${err.message}`);
      throw new BadRequestException(
        `Failed to fetch Google Sheet data: ${err.message}. Make sure sheet permissions allow access.`,
      );
    }

    const { headers, rows } = this.parseCsv(csvData);

    const phoneCol =
      headers.find(
        (h) =>
          /(phone|mobile|cell|contact\s*no|contact\s*number)/i.test(h) &&
          !/name/i.test(h),
      ) ||
      headers.find((h) => /(phone|mobile|cell)/i.test(h)) ||
      headers.find((h) => /number/i.test(h) && !/name/i.test(h)) ||
      headers.find((h) => /(phone|mobile)/i.test(h)) ||
      headers[0];

    const nameCol =
      headers.find((h) =>
        /(contact\s*person|ceo\s*name|candidate\s*name|customer\s*name|client\s*name|applicant\s*name|doctor\s*name)/i.test(
          h,
        ),
      ) ||
      headers.find((h) => /^(name|customer|client|candidate)$/i.test(h)) ||
      headers.find(
        (h) =>
          /(name|customer|client|candidate)/i.test(h) &&
          !/phone|mobile|cell|number|hospital|centre|firm|company|branch/i.test(
            h,
          ),
      ) ||
      headers.find((h) => /(name|customer|client)/i.test(h)) ||
      headers[1];

    const branchCol =
      headers.find((h) => /^(branch|city|district|location|hub)$/i.test(h)) ||
      headers.find((h) => /(branch|city|district|location|hub)/i.test(h));
    const amountCol = headers.find((h) =>
      /(amount|eligibility|loan|limit|value)/i.test(h),
    );
    const stateCol =
      headers.find((h) => /^(state|zone|region)$/i.test(h)) ||
      headers.find((h) => /(state|zone|region)/i.test(h));

    const records: CachedRecord[] = rows.map((row, idx) => {
      const rowIndex = idx + 1;
      const phone = phoneCol ? String(row[phoneCol] || '').trim() : '';
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const customerName = nameCol ? String(row[nameCol] || '').trim() : '';
      const branch = branchCol ? String(row[branchCol] || '').trim() : '';
      const state = stateCol ? String(row[stateCol] || '').trim() : '';
      const eligibilityAmount = amountCol
        ? Number(String(row[amountCol]).replace(/[^0-9.-]+/g, '')) || 0
        : 0;

      return {
        _id: `${fileId}_${rowIndex}`,
        sourceFileId: fileId,
        sourceFileName: fileName,
        folderPath,
        rowIndex,
        phone,
        cleanPhone,
        customerName: customerName || `Customer #${rowIndex}`,
        branch,
        state,
        eligibilityAmount,
        rawData: row,
      };
    });

    const cachedData: CachedFileData = {
      fileId,
      fileName,
      folderPath,
      headers,
      records,
      totalRows: records.length,
      lastCachedAt: new Date().toISOString(),
    };

    // Save to disk cache
    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(cachedData), 'utf8');
      this.logger.log(
        `Cached ${records.length} records for ${fileName} to disk (${(fs.statSync(cacheFilePath).size / (1024 * 1024)).toFixed(2)} MB)`,
      );
    } catch (err: any) {
      this.logger.warn(`Failed writing disk cache for ${fileId}: ${err.message}`);
    }

    this.memoryCache.set(fileId, cachedData);

    // Update DriveSource file counts
    const allocated = await this.getAllocatedCount(fileId);
    await this.driveSourceModel.updateOne(
      { 'files.fileId': fileId },
      {
        $set: {
          'files.$.totalRecords': records.length,
          'files.$.allocatedRecords': allocated,
          'files.$.availableRecords': Math.max(0, records.length - allocated),
          'files.$.lastSyncedAt': new Date(),
        },
      },
    );

    return cachedData;
  }

  /**
   * Helper to check if a record matches all filter criteria
   */
  private matchesQuery(
    rec: CachedRecord,
    query: {
      search?: string;
      city?: string;
      state?: string;
      year?: string;
      category?: string;
      cibilMin?: number;
      lender?: string;
      customColumn?: string;
      customValue?: string;
      minAmount?: number;
      maxAmount?: number;
      filters?: any;
    },
  ): boolean {
    // 1. City / Branch / District filter (supports multiple comma-separated cities)
    if (query.city && query.city.trim() && query.city !== 'ALL') {
      const cityTargets = query.city
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (cityTargets.length > 0) {
        const branchVal = rec.branch.toLowerCase();
        const rawCity = String(rec.rawData.City || '').toLowerCase();
        const rawCITY = String(rec.rawData.CITY || '').toLowerCase();
        const rawBranch = String(rec.rawData.Branch || '').toLowerCase();
        const rawDISTRICT = String(rec.rawData.DISTRICT || '').toLowerCase();
        const rawDistrict = String(rec.rawData.District || '').toLowerCase();

        const cityMatched = cityTargets.some(
          (c) =>
            branchVal.includes(c) ||
            rawCity.includes(c) ||
            rawCITY.includes(c) ||
            rawBranch.includes(c) ||
            rawDISTRICT.includes(c) ||
            rawDistrict.includes(c),
        );
        if (!cityMatched) return false;
      }
    }

    // 2. State filter (supports multiple comma-separated states)
    if (query.state && query.state.trim() && query.state !== 'ALL') {
      const stateTargets = query.state
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (stateTargets.length > 0) {
        const sVal = rec.state.toLowerCase();
        const rawState = String(rec.rawData.State || '').toLowerCase();
        const rawSTATE = String(rec.rawData.STATE || '').toLowerCase();
        const stateMatched = stateTargets.some(
          (s) => sVal.includes(s) || rawState.includes(s) || rawSTATE.includes(s),
        );
        if (!stateMatched) return false;
      }
    }

    // 3. Year / Period filter (supports multiple comma-separated years)
    if (query.year && query.year.trim() && query.year !== 'ALL') {
      const yearTargets = query.year
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (yearTargets.length > 0) {
        const yearMatched = yearTargets.some(
          (y) =>
            String(rec.rawData.Year || '').toLowerCase().includes(y) ||
            String(rec.rawData.YEAR || '').toLowerCase().includes(y) ||
            String(rec.rawData.Login || '').toLowerCase().includes(y) ||
            String(rec.rawData.Offer_Release_Date || '').toLowerCase().includes(y) ||
            String(rec.rawData.Date || '').toLowerCase().includes(y) ||
            String(rec.rawData.DATE || '').toLowerCase().includes(y) ||
            String(rec.rawData['NEET-PG 2025 SCORE'] || '').toLowerCase().includes(y),
        );
        if (!yearMatched) return false;
      }
    }

    // 4. Category / Qualification filter (supports multiple comma-separated categories)
    if (query.category && query.category.trim() && query.category !== 'ALL') {
      const catTargets = query.category
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (catTargets.length > 0) {
        const rawCat = String(rec.rawData.CATEGORY || '').toLowerCase();
        const rawCategory = String(rec.rawData.Category || '').toLowerCase();
        const rawQual = String(rec.rawData.QUALIFICATION || '').toLowerCase();
        const catMatched = catTargets.some(
          (cat) =>
            rawCat === cat ||
            rawCategory === cat ||
            rawQual === cat ||
            rawCat.includes(cat) ||
            rawCategory.includes(cat),
        );
        if (!catMatched) return false;
      }
    }

    // 5. CIBIL Score filter
    if (query.cibilMin !== undefined && Number(query.cibilMin) > 0) {
      const minCibil = Number(query.cibilMin);
      const cibilRaw = rec.rawData.CIBIL || rec.rawData['CIBIL Score'];
      const cibilVal =
        Number(String(cibilRaw || '').replace(/[^0-9.]/g, '')) || 0;
      if (cibilVal < minCibil) return false;
    }

    // 6. Lender / Partner filter (supports multiple comma-separated lenders)
    if (query.lender && query.lender.trim() && query.lender !== 'ALL') {
      const lenderTargets = query.lender
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (lenderTargets.length > 0) {
        const lenderMatched = lenderTargets.some(
          (l) =>
            String(rec.rawData.Lender || '').toLowerCase().includes(l) ||
            String(rec.rawData.Partner_Name || '').toLowerCase().includes(l) ||
            String(rec.rawData['Employer/Business Name'] || '').toLowerCase().includes(l),
        );
        if (!lenderMatched) return false;
      }
    }

    // 7. Custom Column Filter (supports multiple comma-separated values)
    if (query.customColumn && query.customValue && query.customValue.trim()) {
      const col = query.customColumn.trim();
      const isAmountCol = /(amount|eligib|loan|limit|salary|income)/i.test(col);
      // Skip text match if numeric range is being applied
      if (!isAmountCol || (query.minAmount === undefined && query.maxAmount === undefined)) {
        const valTargets = query.customValue
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean);
        if (valTargets.length > 0) {
          const cellVal = String(rec.rawData?.[col] || '').toLowerCase();
          const colLower = col.toLowerCase();
          const matched = valTargets.some((val) => {
            if (cellVal.includes(val)) return true;
            if (colLower.includes('city') || colLower.includes('branch') || colLower.includes('district')) {
              if ((rec.branch || '').toLowerCase().includes(val)) return true;
            } else if (colLower.includes('state')) {
              if ((rec.state || '').toLowerCase().includes(val)) return true;
            } else if (colLower.includes('name')) {
              if ((rec.customerName || '').toLowerCase().includes(val)) return true;
            } else if (colLower.includes('phone') || colLower.includes('mobile')) {
              if (
                (rec.phone || '').toLowerCase().includes(val) ||
                (rec.cleanPhone || '').includes(val)
              ) {
                return true;
              }
            }
            return false;
          });
          if (!matched) return false;
        }
      }
    }

    // 8. Eligibility Amount Range (Itna se Itna Amount)
    const hasMinAmount = query.minAmount !== undefined && Number(query.minAmount) > 0;
    const hasMaxAmount = query.maxAmount !== undefined && Number(query.maxAmount) > 0;
    if (hasMinAmount || hasMaxAmount) {
      let recAmount = rec.eligibilityAmount;
      if (!recAmount && query.customColumn && rec.rawData?.[query.customColumn]) {
        recAmount = Number(String(rec.rawData[query.customColumn]).replace(/[^0-9.-]+/g, '')) || 0;
      }
      if (hasMinAmount && recAmount < Number(query.minAmount)) return false;
      if (hasMaxAmount && recAmount > Number(query.maxAmount)) return false;
    }

    // 8.5 Multi-Column & Multi-Value Dynamic Filters (grouped by column: OR within column, AND across columns)
    if (query.filters) {
      let filterList: Array<{
        column?: string;
        value?: string;
        values?: string[];
        minAmount?: number;
        maxAmount?: number;
      }> = [];

      if (typeof query.filters === 'string') {
        try {
          filterList = JSON.parse(query.filters);
        } catch {
          filterList = [];
        }
      } else if (Array.isArray(query.filters)) {
        filterList = query.filters;
      }

      // Group conditions by column so multiple selections for any column use OR logic, and multiple columns use AND logic
      const colGroups = new Map<
        string,
        {
          isAmountCol: boolean;
          values: string[];
          minAmount?: number;
          maxAmount?: number;
        }
      >();

      for (const flt of filterList) {
        if (!flt || !flt.column) continue;
        const col = flt.column.trim();
        if (!col) continue;
        const isAmountCol = /(amount|eligib|loan|limit|salary|income)/i.test(col);

        let group = colGroups.get(col);
        if (!group) {
          group = { isAmountCol, values: [] };
          colGroups.set(col, group);
        }

        if (isAmountCol) {
          if (flt.minAmount !== undefined) group.minAmount = flt.minAmount;
          if (flt.maxAmount !== undefined) group.maxAmount = flt.maxAmount;
        }

        // Support both flt.values (array of strings) and flt.value (comma-separated string)
        if (Array.isArray(flt.values)) {
          for (const v of flt.values) {
            const str = String(v ?? '').trim().toLowerCase();
            if (str && !group.values.includes(str)) group.values.push(str);
          }
        }
        if (flt.value && String(flt.value).trim()) {
          const parts = String(flt.value).split(',');
          for (const p of parts) {
            const str = p.trim().toLowerCase();
            if (str && !group.values.includes(str)) group.values.push(str);
          }
        }
      }

      // Check each column group
      for (const [col, group] of colGroups.entries()) {
        // Numeric range check for amount columns
        if (
          group.isAmountCol &&
          (group.minAmount !== undefined || group.maxAmount !== undefined)
        ) {
          let recAmount = rec.eligibilityAmount;
          if (!recAmount && rec.rawData?.[col]) {
            recAmount =
              Number(String(rec.rawData[col]).replace(/[^0-9.-]+/g, '')) || 0;
          }
          if (group.minAmount !== undefined && recAmount < Number(group.minAmount)) {
            return false;
          }
          if (group.maxAmount !== undefined && recAmount > Number(group.maxAmount)) {
            return false;
          }
        }

        // Multiple values check (OR within column)
        if (group.values.length > 0) {
          const cellVal = String(rec.rawData?.[col] ?? '').toLowerCase();
          const colLower = col.toLowerCase();
          const branchVal = (rec.branch || '').toLowerCase();
          const stateVal = (rec.state || '').toLowerCase();
          const nameVal = (rec.customerName || '').toLowerCase();
          const phoneVal = (rec.phone || '').toLowerCase();
          const cleanPhoneVal = (rec.cleanPhone || '');

          const isCityCol =
            colLower.includes('city') ||
            colLower.includes('branch') ||
            colLower.includes('district');
          const isStateCol = colLower.includes('state');
          const isNameCol = colLower.includes('name');
          const isPhoneCol =
            colLower.includes('phone') || colLower.includes('mobile');

          const colMatched = group.values.some((target) => {
            if (cellVal.includes(target)) return true;
            if (isCityCol && branchVal.includes(target)) return true;
            if (isStateCol && stateVal.includes(target)) return true;
            if (isNameCol && nameVal.includes(target)) return true;
            if (
              isPhoneCol &&
              (phoneVal.includes(target) || cleanPhoneVal.includes(target))
            ) {
              return true;
            }
            return false;
          });

          if (!colMatched) return false;
        }
      }
    }

    // 9. Global Search
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      const matchesSearch =
        rec.customerName.toLowerCase().includes(s) ||
        rec.phone.toLowerCase().includes(s) ||
        rec.branch.toLowerCase().includes(s) ||
        rec.state.toLowerCase().includes(s) ||
        Object.values(rec.rawData).some((val) =>
          String(val || '').toLowerCase().includes(s),
        );
      if (!matchesSearch) return false;
    }

    return true;
  }

  /**
   * Sync a specific file from Google Drive into disk cache (0 rows in MongoDB Atlas!)
   */
  async syncFileRecords(fileId: string): Promise<{
    message: string;
    totalImported: number;
    newAdded: number;
    duplicatesSkipped?: number;
    available: number;
    allocated: number;
  }> {
    const cached = await this.getFileCachedData(fileId, true);
    const allocated = await this.getAllocatedCount(fileId);
    const available = Math.max(0, cached.totalRows - allocated);

    return {
      message: `File ${cached.fileName} synced and cached successfully (${cached.totalRows} leads available, 0 DB bloat)`,
      totalImported: cached.totalRows,
      newAdded: cached.totalRows,
      duplicatesSkipped: 0,
      available,
      allocated,
    };
  }

  /**
   * Get hierarchy of Managers and Employees for assignment
   */
  async getManagerHierarchy(): Promise<{
    managers: Array<{
      _id: string;
      fullName: string;
      email: string;
      role: string;
      employees: Array<{
        _id: string;
        fullName: string;
        email: string;
        role: string;
      }>;
    }>;
    allEmployees: Array<{
      _id: string;
      fullName: string;
      email: string;
      role: string;
      managerName?: string;
    }>;
  }> {
    const allUsers = await this.userModel
      .find({ isActive: true })
      .select('firstName lastName email role reportsTo teamId')
      .lean();

    const managers = allUsers.filter(
      (u) =>
        u.role === 'MANAGER' ||
        u.role === 'SUPER_ADMIN' ||
        u.role === 'ADMIN' ||
        u.role === 'TEAM_LEADER',
    );

    const userMap = new Map(allUsers.map((u) => [u._id.toString(), u]));

    const resultManagers = managers.map((m) => {
      const mId = m._id.toString();
      const directEmployees = allUsers.filter((u) => {
        if (u._id.toString() === mId) return false;
        if (u.reportsTo && u.reportsTo.toString() === mId) return true;
        if (
          m.teamId &&
          u.teamId &&
          u.teamId.toString() === m.teamId.toString() &&
          u.role === 'EMPLOYEE'
        )
          return true;
        return false;
      });

      return {
        _id: m._id.toString(),
        fullName: `${m.firstName} ${m.lastName}`.trim(),
        email: m.email,
        role: m.role,
        employees: directEmployees.map((e) => ({
          _id: e._id.toString(),
          fullName: `${e.firstName} ${e.lastName}`.trim(),
          email: e.email,
          role: e.role,
        })),
      };
    });

    const allEmployees = allUsers
      .filter((u) => u.role === 'EMPLOYEE' || u.role === 'SOURCER')
      .map((e) => {
        let managerName = 'Unassigned';
        if (e.reportsTo && userMap.has(e.reportsTo.toString())) {
          const m = userMap.get(e.reportsTo.toString())!;
          managerName = `${m.firstName} ${m.lastName}`.trim();
        }
        return {
          _id: e._id.toString(),
          fullName: `${e.firstName} ${e.lastName}`.trim(),
          email: e.email,
          role: e.role,
          managerName,
        };
      });

    return { managers: resultManagers, allEmployees };
  }

  /**
   * Get available filter options (Headers, Cities, States, Years, Categories, Lenders, Cibil, Amount range) for a file
   */
  async getFileFilterOptions(fileId: string): Promise<{
    headers: string[];
    cities: string[];
    states: string[];
    years: string[];
    categories: string[];
    lenders: string[];
    hasCibil: boolean;
    minAmount: number;
    maxAmount: number;
    totalAvailable: number;
    columnUniqueValues?: Record<string, string[]>;
  }> {
    const cached = await this.getFileCachedData(fileId);

    // Fetch allocated indices and phones from MongoDB batch documents
    const { allocatedRowIndices, allocatedPhones } =
      await this.getAllocatedIndices(fileId);

    const citiesSet = new Set<string>();
    const statesMap = new Map<string, string>();
    const yearsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const lendersSet = new Set<string>();
    const columnValuesMap = new Map<string, Set<string>>();
    if (cached.headers) {
      for (const h of cached.headers) {
        columnValuesMap.set(h, new Set<string>());
      }
    }
    let hasCibil = false;
    let minAmount = 0;
    let maxAmount = 0;
    let availableCount = 0;

    for (const rec of cached.records) {
      if (allocatedRowIndices.has(rec.rowIndex)) continue;
      if (rec.cleanPhone && allocatedPhones.has(rec.cleanPhone)) continue;
      availableCount++;

      // Track unique values for every dynamic column
      if (cached.headers && cached.headers.length > 0 && rec.rawData) {
        for (const h of cached.headers) {
          const rawVal = rec.rawData[h];
          if (rawVal !== undefined && rawVal !== null) {
            const str = String(rawVal).trim();
            if (str && str !== '--' && str.length <= 60) {
              const s = columnValuesMap.get(h);
              if (s && s.size < 500) {
                s.add(str);
              }
            }
          }
        }
      }

      // Amount
      if (rec.eligibilityAmount > 0) {
        if (minAmount === 0 || rec.eligibilityAmount < minAmount) {
          minAmount = rec.eligibilityAmount;
        }
        if (rec.eligibilityAmount > maxAmount) {
          maxAmount = rec.eligibilityAmount;
        }
      }

      // City candidates
      const cityCandidates = [
        rec.branch,
        rec.rawData.City,
        rec.rawData.CITY,
        rec.rawData.Branch,
        rec.rawData.DISTRICT,
        rec.rawData.District,
      ];
      for (const c of cityCandidates) {
        const trimmed = String(c || '').trim();
        if (
          trimmed &&
          trimmed.length > 1 &&
          trimmed.length <= 30 &&
          trimmed !== '--' &&
          !/^[0-9]+$/.test(trimmed) &&
          !trimmed.includes('||') &&
          !trimmed.includes('|') &&
          !/(hospital|centre|firm|company|reject|process|cibil|bank|case|loan|lacs|salary|emi|stipend)/i.test(
            trimmed,
          )
        ) {
          citiesSet.add(trimmed.toUpperCase());
        }
      }

      // State candidates
      const stateCandidates = [rec.state, rec.rawData.State, rec.rawData.STATE];
      for (const s of stateCandidates) {
        const trimmed = String(s || '').trim();
        if (trimmed && trimmed.length > 1 && !/^[0-9]+$/.test(trimmed)) {
          const key = trimmed.toLowerCase();
          if (!statesMap.has(key)) {
            const titleCase = trimmed
              .toLowerCase()
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            statesMap.set(key, titleCase);
          }
        }
      }

      // Year / Period
      const yearCandidates = [
        rec.rawData.Year,
        rec.rawData.YEAR,
        rec.rawData.Login,
        rec.rawData.Offer_Release_Date,
        rec.rawData.Date,
        rec.rawData.DATE,
        rec.rawData['NEET-PG 2025 SCORE'],
      ];
      for (const y of yearCandidates) {
        const trimmed = String(y || '').trim();
        if (trimmed && trimmed.length > 0 && trimmed !== '--') {
          yearsSet.add(trimmed);
        }
      }

      // Category / Qualification
      const catCandidates = [
        rec.rawData.CATEGORY,
        rec.rawData.Category,
        rec.rawData.QUALIFICATION,
      ];
      for (const cat of catCandidates) {
        const trimmed = String(cat || '').trim();
        if (trimmed && trimmed.length > 0 && trimmed !== '--') {
          categoriesSet.add(trimmed);
        }
      }

      // Lender / Partner / Employer
      const lenderCandidates = [
        rec.rawData.Lender,
        rec.rawData.Partner_Name,
        rec.rawData['Employer/Business Name'],
      ];
      for (const l of lenderCandidates) {
        const trimmed = String(l || '').trim();
        if (trimmed && trimmed.length > 1 && trimmed !== '--') {
          lendersSet.add(trimmed);
        }
      }

      // CIBIL check
      if (!hasCibil) {
        const c = rec.rawData.CIBIL || rec.rawData['CIBIL Score'];
        if (c && String(c).trim() !== '' && String(c) !== '--' && Number(c) > 0) {
          hasCibil = true;
        }
      }
    }

    const cities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b));
    const states = Array.from(statesMap.values()).sort((a, b) =>
      a.localeCompare(b),
    );
    const years = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    const categories = Array.from(categoriesSet).sort((a, b) =>
      a.localeCompare(b),
    );
    const lenders = Array.from(lendersSet).sort((a, b) => a.localeCompare(b));

    const columnUniqueValues: Record<string, string[]> = {};
    for (const [col, s] of columnValuesMap.entries()) {
      columnUniqueValues[col] = Array.from(s).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
      );
    }

    return {
      headers: cached.headers,
      cities,
      states,
      years,
      categories,
      lenders,
      hasCibil,
      minAmount,
      maxAmount,
      totalAvailable: availableCount,
      columnUniqueValues,
    };
  }

  /**
   * Search unique values for a column directly from the file's records in backend
   */
  async searchColumnValues(
    fileId: string,
    column: string,
    search = '',
    limit = 100,
  ): Promise<string[]> {
    if (!column || !column.trim()) return [];
    const cached = await this.getFileCachedData(fileId);
    const { allocatedRowIndices, allocatedPhones } =
      await this.getAllocatedIndices(fileId);

    const valuesSet = new Set<string>();
    const q = search.trim().toLowerCase();
    const colTrimmed = column.trim();

    for (const rec of cached.records) {
      if (allocatedRowIndices.has(rec.rowIndex)) continue;
      if (rec.cleanPhone && allocatedPhones.has(rec.cleanPhone)) continue;

      let rawVal = rec.rawData?.[colTrimmed];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
        const colLower = colTrimmed.toLowerCase();
        if (colLower.includes('city') || colLower.includes('branch') || colLower.includes('district')) {
          rawVal = rec.branch;
        } else if (colLower.includes('state')) {
          rawVal = rec.state;
        } else if (colLower.includes('name')) {
          rawVal = rec.customerName;
        }
      }

      if (rawVal !== undefined && rawVal !== null) {
        const str = String(rawVal).trim();
        if (str && str !== '--' && str.length <= 80) {
          if (!q || str.toLowerCase().includes(q)) {
            valuesSet.add(str);
            if (valuesSet.size >= limit) break;
          }
        }
      }
    }
    return Array.from(valuesSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
  }

  /**
   * Get Available (Unallocated) records for a selected file
   */
  async getAvailableRecords(
    fileId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      city?: string;
      state?: string;
      year?: string;
      category?: string;
      cibilMin?: number;
      lender?: string;
      customColumn?: string;
      customValue?: string;
      minAmount?: number;
      maxAmount?: number;
      filters?: any;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    headers: string[];
  }> {
    const cached = await this.getFileCachedData(fileId);

    // Get all allocated records from MongoDB batch documents
    const { allocatedRowIndices, allocatedPhones } =
      await this.getAllocatedIndices(fileId);

    const seenPhoneSet = new Set<string>();
    const available: CachedRecord[] = [];

    for (const rec of cached.records) {
      if (allocatedRowIndices.has(rec.rowIndex)) continue;
      if (rec.cleanPhone && allocatedPhones.has(rec.cleanPhone)) continue;

      // Deduplicate phone numbers within the file
      if (rec.cleanPhone && rec.cleanPhone.length >= 8) {
        if (seenPhoneSet.has(rec.cleanPhone)) continue;
        seenPhoneSet.add(rec.cleanPhone);
      }

      if (this.matchesQuery(rec, query)) {
        available.push(rec);
      }
    }

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 50));
    const skip = (page - 1) * limit;
    const pageSlice = available.slice(skip, skip + limit);

    return {
      data: pageSlice,
      total: available.length,
      page,
      limit,
      headers: cached.headers,
    };
  }

  /**
   * Get Allocated records (flattened for table view)
   */
  async getAllocatedRecords(
    query: {
      fileId?: string;
      managerId?: string;
      employeeId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      fileId,
      managerId,
      employeeId,
      search,
      page = 1,
      limit = 50,
    } = query;

    const filter: any = {
      status: RecordAllocationStatus.ALLOCATED,
    };

    if (fileId) filter.sourceFileId = fileId;
    if (managerId) filter.assignedManagerId = new Types.ObjectId(managerId);
    if (employeeId) filter.assignedEmployeeId = new Types.ObjectId(employeeId);

    const allocations = await this.driveRecordModel
      .find(filter)
      .sort({ allocatedAt: -1, updatedAt: -1 })
      .lean();

    // Fetch Notion pages to attach live caller remarks and dispositions
    const pageIds: Types.ObjectId[] = allocations
      .map((a) => a.notionPageId)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const notionPages =
      pageIds.length > 0
        ? await this.notionPageModel
            .find({ _id: { $in: pageIds as any } })
            .select('rows')
            .lean()
        : [];

    const notionRowMap = new Map<
      string,
      { disposition: string; remark: string }
    >();
    for (const np of notionPages) {
      for (const row of np.rows || []) {
        if (row.driveRecordId) {
          notionRowMap.set(row.driveRecordId, {
            disposition: row.disposition || row.Disposition || '',
            remark: row.feedback_notes || row.remarks || row.Remarks || '',
          });
        }
      }
    }

    const flattened: any[] = [];
    for (const a of allocations) {
      for (const r of a.records || []) {
        const callingInfo = notionRowMap.get(`${a._id}_${r.rowIndex}`);
        flattened.push({
          _id: `${a._id}_${r.rowIndex}`,
          allocationDocId: a._id.toString(),
          sourceFileId: a.sourceFileId,
          sourceFileName: a.sourceFileName,
          folderPath: a.folderPath,
          rowIndex: r.rowIndex,
          phone: r.phone,
          customerName: r.customerName,
          branch: r.branch,
          state: r.state,
          eligibilityAmount: r.eligibilityAmount,
          rawData: r.rawData,
          assignedManagerId: a.assignedManagerId,
          assignedManagerName: a.assignedManagerName,
          assignedEmployeeId: a.assignedEmployeeId,
          assignedEmployeeName: a.assignedEmployeeName,
          notionPageId: a.notionPageId,
          notionPageTitle: a.notionPageTitle,
          allocatedAt: a.allocatedAt,
          remarks: a.remarks,
          disposition: callingInfo?.disposition || '',
          callingRemark: callingInfo?.remark || '',
          status: RecordAllocationStatus.ALLOCATED,
        });
      }
    }

    let filtered = flattened;
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = flattened.filter(
        (r) =>
          (r.customerName && r.customerName.toLowerCase().includes(s)) ||
          (r.phone && r.phone.toLowerCase().includes(s)) ||
          (r.branch && r.branch.toLowerCase().includes(s)) ||
          (r.state && r.state.toLowerCase().includes(s)) ||
          (r.sourceFileName && r.sourceFileName.toLowerCase().includes(s)),
      );
    }

    const skip = (Number(page) - 1) * Number(limit);
    const pageSlice = filtered.slice(skip, skip + Number(limit));

    return {
      data: pageSlice,
      total: filtered.length,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Get all Notion sheets/files assigned to a specific employee
   */
  async getEmployeeSheets(employeeId: string): Promise<
    Array<{
      _id: string;
      title: string;
      rowCount: number;
      updatedAt: Date;
    }>
  > {
    const pages = await this.notionPageModel
      .find({
        assignedMemberId: new Types.ObjectId(employeeId) as any,
        isDeleted: false,
        pageType: 'SHEET',
      })
      .select('_id title rows updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    return pages.map((p: any) => ({
      _id: p._id.toString(),
      title: p.title,
      rowCount: Array.isArray(p.rows) ? p.rows.length : 0,
      updatedAt: p.updatedAt || new Date(),
    }));
  }

  /**
   * Allocate data:
   * - Manager -> Employee
   * - Inserts EXACTLY 1 DOCUMENT per allocation into MongoDB with `records: Array`!
   * - Populates employee's Notion Sheet
   * - Synchronized with Leads CRM table
   */
  /**
   * Selects records using a fair, stratified balanced distribution across states.
   * If fewer rows match than requested count (or count <= 0), returns all matching.
   * Rows within each state are shuffled/randomized so there is no fixed order bias.
   */
  public selectBalancedRecordsByState(
    matchingRecords: CachedRecord[],
    count?: number,
  ): {
    selectedRecords: CachedRecord[];
    stateCounts: Record<string, number>;
  } {
    const totalMatching = matchingRecords.length;

    // Helper: Fisher-Yates shuffle
    const shuffle = <T>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // If count is 0 or undefined, take all matching rows
    const targetCount =
      count !== undefined && count !== null && count > 0
        ? Math.min(count, totalMatching)
        : totalMatching;

    // Helper to extract clean state name from record
    const getRecordState = (rec: CachedRecord): string => {
      const rawState =
        rec.state ||
        rec.rawData?.State ||
        rec.rawData?.STATE ||
        rec.rawData?.state ||
        '';
      const clean = String(rawState).trim().toUpperCase();
      if (
        !clean ||
        /^\d+$/.test(clean) ||
        clean === 'N/A' ||
        clean === 'NA' ||
        clean === 'NULL' ||
        clean === 'NONE' ||
        clean === '-'
      ) {
        return 'OTHER';
      }
      return clean;
    };

    // Group matching records by state
    const stateGroups = new Map<string, CachedRecord[]>();
    for (const rec of matchingRecords) {
      const st = getRecordState(rec);
      if (!stateGroups.has(st)) {
        stateGroups.set(st, []);
      }
      stateGroups.get(st)!.push(rec);
    }

    // Shuffle records inside each state group to randomize selection
    for (const [st, recs] of stateGroups.entries()) {
      stateGroups.set(st, shuffle(recs));
    }

    // If targetCount >= totalMatching, take all records (interleaved across states)
    if (targetCount >= totalMatching) {
      const stateCounts: Record<string, number> = {};
      for (const [st, recs] of stateGroups.entries()) {
        stateCounts[st] = recs.length;
      }
      const interleaved: CachedRecord[] = [];
      const stateArrays = Array.from(stateGroups.values());
      const maxLen = Math.max(...stateArrays.map((a) => a.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const arr of stateArrays) {
          if (i < arr.length) {
            interleaved.push(arr[i]);
          }
        }
      }
      return {
        selectedRecords: interleaved,
        stateCounts,
      };
    }

    // Stratified Equal Distribution / Fair Quota across states
    const states = Array.from(stateGroups.keys());
    const selectedByState = new Map<string, CachedRecord[]>();
    states.forEach((s) => selectedByState.set(s, []));

    let remainingNeeded = targetCount;
    const activeStates = new Set(states);

    while (remainingNeeded > 0 && activeStates.size > 0) {
      const perState = Math.max(1, Math.floor(remainingNeeded / activeStates.size));
      let allocatedThisRound = 0;

      for (const state of Array.from(activeStates)) {
        if (remainingNeeded <= 0) break;

        const pool = stateGroups.get(state)!;
        const currentSelected = selectedByState.get(state)!.length;
        const availableInPool = pool.length - currentSelected;

        if (availableInPool <= 0) {
          activeStates.delete(state);
          continue;
        }

        const take = Math.min(perState, availableInPool, remainingNeeded);
        const startIndex = currentSelected;
        const items = pool.slice(startIndex, startIndex + take);
        selectedByState.get(state)!.push(...items);

        remainingNeeded -= take;
        allocatedThisRound += take;

        if (selectedByState.get(state)!.length >= pool.length) {
          activeStates.delete(state);
        }
      }

      // If remainder cannot be divided evenly with floor, give 1 each to remaining active states
      if (allocatedThisRound === 0 && remainingNeeded > 0) {
        for (const state of Array.from(activeStates)) {
          if (remainingNeeded <= 0) break;
          const pool = stateGroups.get(state)!;
          const currentSelected = selectedByState.get(state)!.length;
          if (currentSelected < pool.length) {
            selectedByState.get(state)!.push(pool[currentSelected]);
            remainingNeeded -= 1;
            allocatedThisRound += 1;
            if (selectedByState.get(state)!.length >= pool.length) {
              activeStates.delete(state);
            }
          }
        }
        if (allocatedThisRound === 0) break;
      }
    }

    // Interleave the selected records so states are nicely mixed in the output
    const interleavedSelected: CachedRecord[] = [];
    const selectedArrays = Array.from(selectedByState.values());
    const maxAllocated = Math.max(...selectedArrays.map((a) => a.length), 0);

    for (let i = 0; i < maxAllocated; i++) {
      for (const arr of selectedArrays) {
        if (i < arr.length) {
          interleavedSelected.push(arr[i]);
        }
      }
    }

    const stateCounts: Record<string, number> = {};
    for (const [st, recs] of selectedByState.entries()) {
      if (recs.length > 0) {
        stateCounts[st] = recs.length;
      }
    }

    return {
      selectedRecords: interleavedSelected.slice(0, targetCount),
      stateCounts,
    };
  }

  /**
   * Preview records to be allocated with balanced state distribution
   */
  async previewRecords(dto: PreviewRecordsDto): Promise<{
    totalMatching: number;
    selectedCount: number;
    stateCounts: Record<string, number>;
    records: CachedRecord[];
    recordIds: string[];
    headers: string[];
  }> {
    const { sourceFileId, count } = dto;
    const cached = await this.getFileCachedData(sourceFileId);

    const { allocatedRowIndices, allocatedPhones } =
      await this.getAllocatedIndices(sourceFileId);

    const seenPhoneSet = new Set<string>();
    const matchingAvailableRecords: CachedRecord[] = [];

    for (const rec of cached.records) {
      if (allocatedRowIndices.has(rec.rowIndex)) continue;
      if (rec.cleanPhone && allocatedPhones.has(rec.cleanPhone)) continue;

      if (rec.cleanPhone && rec.cleanPhone.length >= 8) {
        if (seenPhoneSet.has(rec.cleanPhone)) continue;
        seenPhoneSet.add(rec.cleanPhone);
      }

      if (
        this.matchesQuery(rec, {
          city: dto.city,
          state: dto.state,
          year: dto.year,
          category: dto.category,
          cibilMin: dto.cibilMin,
          lender: dto.lender,
          customColumn: dto.customColumn,
          customValue: dto.customValue,
          minAmount: dto.minAmount,
          maxAmount: dto.maxAmount,
          filters: dto.filters,
        })
      ) {
        matchingAvailableRecords.push(rec);
      }
    }

    const { selectedRecords, stateCounts } = this.selectBalancedRecordsByState(
      matchingAvailableRecords,
      count,
    );

    return {
      totalMatching: matchingAvailableRecords.length,
      selectedCount: selectedRecords.length,
      stateCounts,
      records: selectedRecords,
      recordIds: selectedRecords.map((r) => r._id),
      headers: cached.headers || [],
    };
  }

  async allocateRecords(
    dto: AllocateRecordsDto,
    currentUser?: any,
  ): Promise<{
    message: string;
    allocatedCount: number;
    managerName: string;
    employeeName: string;
    sheetTitle: string;
    sheetId: string;
  }> {
    const {
      sourceFileId,
      managerId,
      employeeId,
      recordIds,
      count,
      remarks,
      targetSheetName,
      targetPageId,
    } = dto;

    const [manager, employee] = await Promise.all([
      this.userModel.findById(managerId),
      this.userModel.findById(employeeId),
    ]);

    if (!manager) throw new NotFoundException('Selected manager not found');
    if (!employee) throw new NotFoundException('Selected employee not found');

    const managerName = `${manager.firstName} ${manager.lastName}`.trim();
    const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

    // Load cached data for the source file
    const cached = await this.getFileCachedData(sourceFileId);

    // Fetch already allocated row indices and phone numbers from MongoDB Atlas
    const { allocatedRowIndices, allocatedPhones } =
      await this.getAllocatedIndices(sourceFileId);

    // Determine target records to allocate
    let targetRecords: CachedRecord[] = [];

    if (recordIds && recordIds.length > 0) {
      const requestedIds = new Set(recordIds);
      targetRecords = cached.records.filter(
        (r) =>
          requestedIds.has(r._id) &&
          !allocatedRowIndices.has(r.rowIndex) &&
          (!r.cleanPhone || !allocatedPhones.has(r.cleanPhone)),
      );
    } else if (count && count > 0) {
      const seenPhoneSet = new Set<string>();
      const matchingAvailableRecords: CachedRecord[] = [];

      for (const rec of cached.records) {
        if (allocatedRowIndices.has(rec.rowIndex)) continue;
        if (rec.cleanPhone && allocatedPhones.has(rec.cleanPhone)) continue;

        if (rec.cleanPhone && rec.cleanPhone.length >= 8) {
          if (seenPhoneSet.has(rec.cleanPhone)) continue;
          seenPhoneSet.add(rec.cleanPhone);
        }

        if (
          this.matchesQuery(rec, {
            city: dto.city,
            state: dto.state,
            year: dto.year,
            category: dto.category,
            cibilMin: dto.cibilMin,
            lender: dto.lender,
            customColumn: dto.customColumn,
            customValue: dto.customValue,
            minAmount: dto.minAmount,
            maxAmount: dto.maxAmount,
            filters: dto.filters,
          })
        ) {
          matchingAvailableRecords.push(rec);
        }
      }

      const { selectedRecords } = this.selectBalancedRecordsByState(
        matchingAvailableRecords,
        count,
      );
      targetRecords = selectedRecords;
    } else {
      throw new BadRequestException(
        'Please specify either recordIds or count to allocate',
      );
    }

    if (targetRecords.length === 0) {
      throw new BadRequestException(
        'No available records found to allocate for this file.',
      );
    }

    try {
      const now = new Date();
      const updaterId = currentUser?._id
        ? typeof currentUser._id === 'string'
          ? new Types.ObjectId(currentUser._id)
          : currentUser._id
        : manager._id;

      // Setup Notion sheet first
      const rawKeys =
        cached.headers && cached.headers.length > 0
          ? cached.headers
          : targetRecords[0].rawData
          ? Object.keys(targetRecords[0].rawData)
          : [];

      let defaultColumns: Array<{ key: string; name: string; type: string }> =
        [];
      if (rawKeys.length > 0) {
        defaultColumns = rawKeys.map((k, i) => ({
          key: `col_${i}`,
          name: k,
          type: 'text',
        }));
      } else {
        defaultColumns = [
          { key: 'col_0', name: 'Customer Name', type: 'text' },
          { key: 'col_1', name: 'Phone', type: 'text' },
          { key: 'col_2', name: 'Branch', type: 'text' },
          { key: 'col_3', name: 'Eligibility Amount', type: 'text' },
          { key: 'col_4', name: 'State', type: 'text' },
        ];
      }

      let targetPage: NotionPageDocument | null = null;
      if (targetPageId) {
        targetPage = await this.notionPageModel.findOne({
          _id: new Types.ObjectId(targetPageId) as any,
          assignedMemberId: employee._id as any,
          isDeleted: false,
        });
      }

      const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
      const computedTitle =
        targetSheetName?.trim() ||
        `${targetRecords[0].sourceFileName} - ${dateStr}`;

      if (!targetPage) {
        targetPage = await this.notionPageModel.findOne({
          assignedMemberId: employee._id as any,
          title: computedTitle,
          isDeleted: false,
        });
      }

      if (!targetPage) {
        targetPage = await this.notionPageModel.create({
          title: computedTitle,
          icon: '📄',
          pageType: 'SHEET',
          section: 'SHARED',
          columns: defaultColumns,
          rows: [],
          teamId: (employee.teamId || manager.teamId || null) as any,
          createdBy: (updaterId || manager._id) as any,
          parentPageId: null as any,
          sharedWith: [employee._id as any],
          assignedMemberId: employee._id as any,
          isDeleted: false,
        });
      }

      // Insert EXACTLY ONE document in MongoDB Atlas with the records array!
      const allocationDoc = await this.driveRecordModel.create({
        sourceFileId,
        sourceFileName: targetRecords[0].sourceFileName,
        folderPath: targetRecords[0].folderPath,
        status: RecordAllocationStatus.ALLOCATED,
        assignedManagerId: manager._id,
        assignedManagerName: managerName,
        assignedEmployeeId: employee._id,
        assignedEmployeeName: employeeName,
        notionPageId: targetPage._id,
        notionPageTitle: targetPage.title,
        allocatedCount: targetRecords.length,
        allocatedAt: now,
        allocatedBy: updaterId,
        remarks: remarks || '',
        records: targetRecords.map((rec) => ({
          id: rec._id,
          rowIndex: rec.rowIndex,
          phone: rec.phone,
          cleanPhone: rec.cleanPhone,
          customerName: rec.customerName,
          branch: rec.branch,
          state: rec.state,
          eligibilityAmount: rec.eligibilityAmount,
          rawData: rec.rawData,
        })),
        history: [
          {
            action: 'ALLOCATED',
            managerId: manager._id.toString(),
            managerName,
            employeeId: employee._id.toString(),
            employeeName,
            performedBy: currentUser?.email || 'Admin',
            timestamp: now,
            notes: remarks || `Allocated ${targetRecords.length} records to sheet`,
          },
        ],
      });

      const pageColumns =
        targetPage.columns && targetPage.columns.length > 0
          ? targetPage.columns
          : defaultColumns;
      const baseRowIndex = Array.isArray(targetPage.rows)
        ? targetPage.rows.length
        : 0;

      const newRows = targetRecords.map((rec, idx) => {
        const rowId = `row_${Date.now()}_${baseRowIndex + idx}_${Math.floor(Math.random() * 1000)}`;
        const rowObj: Record<string, any> = {
          id: rowId,
          driveRecordId: `${allocationDoc._id}_${rec.rowIndex}`,
          disposition: '',
          feedback_notes: remarks || '',
        };

        pageColumns.forEach((col: any) => {
          const matchingKey = rawKeys.find(
            (k) => k.toLowerCase() === col.name.toLowerCase(),
          );
          if (matchingKey && rec.rawData?.[matchingKey] !== undefined) {
            rowObj[col.key] = String(rec.rawData[matchingKey]);
          } else if (col.name.toLowerCase().includes('name')) {
            rowObj[col.key] = rec.customerName || '';
          } else if (
            col.name.toLowerCase().includes('phone') ||
            col.name.toLowerCase().includes('mobile')
          ) {
            rowObj[col.key] = rec.phone || '';
          } else if (
            col.name.toLowerCase().includes('branch') ||
            col.name.toLowerCase().includes('city')
          ) {
            rowObj[col.key] = rec.branch || '';
          } else if (
            col.name.toLowerCase().includes('amount') ||
            col.name.toLowerCase().includes('eligibility')
          ) {
            rowObj[col.key] = rec.eligibilityAmount
              ? String(rec.eligibilityAmount)
              : '';
          } else if (col.name.toLowerCase().includes('state')) {
            rowObj[col.key] = rec.state || '';
          } else {
            rowObj[col.key] = rec.rawData?.[col.name] ?? '';
          }
        });

        return rowObj;
      });

      // Push new rows to Notion Sheet
      await this.notionPageModel.findByIdAndUpdate(targetPage._id, {
        $push: { rows: { $each: newRows } },
        $set: {
          columns: pageColumns,
          updatedAt: now,
        },
      });

      // Sync to Leads CRM table for the employee
      for (let i = 0; i < targetRecords.length; i++) {
        const rec = targetRecords[i];
        const leadIdStr = `DRV-${Date.now().toString().slice(-6)}-${i}-${Math.floor(Math.random() * 1000)}`;
        try {
          await this.leadModel.create({
            leadId: leadIdStr,
            fullName: rec.customerName || 'Drive Lead',
            phone: rec.phone || '0000000000',
            city: rec.branch || rec.state || '',
            loanAmount: rec.eligibilityAmount || 0,
            status: LeadStatus.NEW,
            leadSource: `Drive: ${rec.sourceFileName}`,
            assignedTo: employee._id.toString() as any,
          });
        } catch (e: any) {
          this.logger.debug(`Lead creation note: ${e.message}`);
        }
      }

      // Update counts in DriveSource
      const allocatedTotal = await this.getAllocatedCount(sourceFileId);
      await this.driveSourceModel.updateOne(
        { 'files.fileId': sourceFileId },
        {
          $set: {
            'files.$.totalRecords': cached.totalRows,
            'files.$.allocatedRecords': allocatedTotal,
            'files.$.availableRecords': Math.max(
              0,
              cached.totalRows - allocatedTotal,
            ),
          },
        },
      );

      // Record permanent audit log for this allocation
      try {
        await this.driveAllocationLogModel.create({
          action: AllocationActionType.ALLOCATED,
          sourceFileId,
          sourceFileName: targetRecords[0].sourceFileName,
          folderPath: targetRecords[0].folderPath,
          count: targetRecords.length,
          toEmployeeId: employee._id,
          toEmployeeName: employeeName,
          toManagerId: manager._id,
          toManagerName: managerName,
          targetSheetTitle: targetPage.title,
          performedBy: currentUser?.email || currentUser?.name || 'Admin',
          performedById: updaterId,
          remarks: remarks || '',
          recordsSummary: targetRecords.map((r) => ({
            rowIndex: r.rowIndex,
            customerName: r.customerName,
            phone: r.phone,
            branch: r.branch,
            state: r.state,
            eligibilityAmount: r.eligibilityAmount,
          })),
        });
      } catch (logErr: any) {
        this.logger.warn(`Failed to save allocation log: ${logErr.message}`);
      }

      return {
        message: `Successfully allocated ${targetRecords.length} records to ${employeeName}'s file "${targetPage.title}" (Manager: ${managerName})`,
        allocatedCount: targetRecords.length,
        managerName,
        employeeName,
        sheetTitle: targetPage.title,
        sheetId: targetPage._id.toString(),
      };
    } catch (err: any) {
      this.logger.error(`Allocation error: ${err.message}`, err.stack);
      throw new BadRequestException(`Allocation failed: ${err.message}`);
    }
  }

  /**
   * Return Allocated Records back to Source File ("jb admin chahega tb return ho jaega us file me")
   * Updates/Deletes allocation document in MongoDB Atlas to immediately reclaim database storage!
   */
  async returnRecordsToFile(
    dto: ReturnRecordsDto,
    currentUser?: any,
  ): Promise<{
    message: string;
    returnedCount: number;
  }> {
    const { recordIds, reason } = dto;
    if (!recordIds || recordIds.length === 0) {
      throw new BadRequestException('No recordIds provided to return');
    }

    const requestedIds = new Set(recordIds);
    const driveRecordIdsToPull = new Set<string>(recordIds);
    const allocations = await this.driveRecordModel.find({
      status: RecordAllocationStatus.ALLOCATED,
    });

    let returnedCount = 0;
    const affectedFileIds = new Set<string>();
    const affectedPageIds = new Set<string>();
    const phonesToClean: string[] = [];

    for (const alloc of allocations) {
      const remainingRecords: any[] = [];
      const removedRowIndices: number[] = [];

      for (const rec of alloc.records || []) {
        const fullVirtualId = `${alloc._id}_${rec.rowIndex}`;
        if (
          requestedIds.has(fullVirtualId) ||
          requestedIds.has(rec.id) ||
          requestedIds.has(alloc._id.toString())
        ) {
          returnedCount++;
          removedRowIndices.push(rec.rowIndex);
          driveRecordIdsToPull.add(fullVirtualId);
          if (rec.phone) phonesToClean.push(rec.phone);
        } else {
          remainingRecords.push(rec);
        }
      }

      if (removedRowIndices.length > 0) {
        affectedFileIds.add(alloc.sourceFileId);
        if (alloc.notionPageId) {
          affectedPageIds.add(alloc.notionPageId.toString());
        }

        // Fetch user's calling remarks and dispositions from Notion before clearing
        let allocNotionPage: any = null;
        if (alloc.notionPageId) {
          try {
            allocNotionPage = await this.notionPageModel
              .findById(alloc.notionPageId)
              .select('rows')
              .lean();
          } catch {
            allocNotionPage = null;
          }
        }

        const rowRemarksMap = new Map<
          string,
          { disposition: string; remark: string }
        >();
        if (allocNotionPage?.rows) {
          for (const row of allocNotionPage.rows) {
            if (row.driveRecordId) {
              rowRemarksMap.set(row.driveRecordId, {
                disposition: row.disposition || row.Disposition || '',
                remark:
                  row.feedback_notes || row.remarks || row.Remarks || '',
              });
            }
          }
        }

        const dispSummary: Record<string, number> = {};
        for (const rIdx of removedRowIndices) {
          const vId = `${alloc._id}_${rIdx}`;
          const d = rowRemarksMap.get(vId)?.disposition || 'Pending';
          dispSummary[d] = (dispSummary[d] || 0) + 1;
        }

        // Record permanent audit log for this return with full caller remarks
        try {
          await this.driveAllocationLogModel.create({
            action: AllocationActionType.RETURNED,
            sourceFileId: alloc.sourceFileId,
            sourceFileName: alloc.sourceFileName,
            folderPath: alloc.folderPath,
            count: removedRowIndices.length,
            fromEmployeeId: alloc.assignedEmployeeId,
            fromEmployeeName: alloc.assignedEmployeeName,
            fromManagerId: alloc.assignedManagerId,
            fromManagerName: alloc.assignedManagerName,
            targetSheetTitle: alloc.notionPageTitle,
            performedBy: currentUser?.email || currentUser?.name || 'Admin',
            performedById: currentUser?._id,
            remarks: reason || 'Returned to source file',
            dispositionSummary: dispSummary,
            recordsSummary: (alloc.records || [])
              .filter((r) => removedRowIndices.includes(r.rowIndex))
              .map((r) => {
                const fullVirtualId = `${alloc._id}_${r.rowIndex}`;
                const info = rowRemarksMap.get(fullVirtualId);
                return {
                  rowIndex: r.rowIndex,
                  customerName: r.customerName,
                  phone: r.phone,
                  branch: r.branch,
                  state: r.state,
                  eligibilityAmount: r.eligibilityAmount,
                  disposition: info?.disposition || '',
                  remarks: info?.remark || '',
                };
              }),
          });
        } catch (logErr: any) {
          this.logger.warn(`Failed to save return log: ${logErr.message}`);
        }

        if (remainingRecords.length === 0) {
          // Entire allocation batch returned -> Delete the 1 document completely!
          await this.driveRecordModel.deleteOne({ _id: alloc._id });
        } else {
          // Partial allocation returned -> update records array & count in the 1 document
          await this.driveRecordModel.updateOne(
            { _id: alloc._id },
            {
              $set: {
                records: remainingRecords,
                allocatedCount: remainingRecords.length,
              },
              $push: {
                history: {
                  action: 'RETURNED',
                  performedBy: currentUser?.email || 'Admin',
                  timestamp: new Date(),
                  notes:
                    reason ||
                    `Returned ${removedRowIndices.length} records back to file`,
                },
              },
            },
          );
        }
      }
    }

    // Clean up rows from Notion sheets
    for (const pageId of affectedPageIds) {
      try {
        await this.notionPageModel.updateOne(
          { _id: new Types.ObjectId(pageId) },
          {
            $pull: {
              rows: { driveRecordId: { $in: Array.from(driveRecordIdsToPull) } },
            } as any,
          },
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to clean Notion page ${pageId}: ${err.message}`,
        );
      }
    }

    // Clean up untouched leads in CRM Leads table
    if (phonesToClean.length > 0) {
      try {
        await this.leadModel.deleteMany({
          phone: { $in: phonesToClean },
          leadSource: { $regex: /^Drive:/ },
          status: LeadStatus.NEW,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to clean leads: ${err.message}`);
      }
    }

    // Update DriveSource counts for each affected file
    for (const fid of affectedFileIds) {
      const allocatedTotal = await this.getAllocatedCount(fid);
      const cached = this.memoryCache.get(fid);
      const total = cached?.totalRows || this.fileTrueCounts[fid] || 0;
      await this.driveSourceModel.updateOne(
        { 'files.fileId': fid },
        {
          $set: {
            'files.$.allocatedRecords': allocatedTotal,
            'files.$.availableRecords': Math.max(0, total - allocatedTotal),
          },
        },
      );
    }

    return {
      message: `Successfully returned ${returnedCount} records back to source file(s) and freed database storage`,
      returnedCount,
    };
  }

  /**
   * Reassign Allocated Records ("ar assign bi kr skte kisi ko")
   */
  async reassignRecords(
    dto: ReassignRecordsDto,
    currentUser?: any,
  ): Promise<{
    message: string;
    reassignedCount: number;
    newManagerName: string;
    newEmployeeName: string;
  }> {
    const { recordIds, managerId, employeeId, remarks } = dto;
    if (!recordIds || recordIds.length === 0) {
      throw new BadRequestException('No recordIds provided to reassign');
    }

    const [manager, employee] = await Promise.all([
      this.userModel.findById(managerId),
      this.userModel.findById(employeeId),
    ]);

    if (!manager) throw new NotFoundException('Selected manager not found');
    if (!employee) throw new NotFoundException('Selected employee not found');

    const managerName = `${manager.firstName} ${manager.lastName}`.trim();
    const employeeName = `${employee.firstName} ${employee.lastName}`.trim();
    const now = new Date();

    // Reassigning records from batches
    let reassignedCount = 0;
    const requestedIds = new Set(recordIds);
    const allocations = await this.driveRecordModel.find({
      status: RecordAllocationStatus.ALLOCATED,
    });

    const recordsToMove: any[] = [];
    let sourceFileId = '';
    let sourceFileName = '';
    let folderPath = '';

    for (const alloc of allocations) {
      const remaining: any[] = [];
      for (const rec of alloc.records || []) {
        const fullVirtualId = `${alloc._id}_${rec.rowIndex}`;
        if (
          requestedIds.has(fullVirtualId) ||
          requestedIds.has(rec.id) ||
          requestedIds.has(alloc._id.toString())
        ) {
          reassignedCount++;
          recordsToMove.push(rec);
          sourceFileId = alloc.sourceFileId;
          sourceFileName = alloc.sourceFileName;
          folderPath = alloc.folderPath;
        } else {
          remaining.push(rec);
        }
      }

      if (recordsToMove.length > 0) {
        if (remaining.length === 0) {
          await this.driveRecordModel.deleteOne({ _id: alloc._id });
        } else {
          await this.driveRecordModel.updateOne(
            { _id: alloc._id },
            {
              $set: {
                records: remaining,
                allocatedCount: remaining.length,
              },
            },
          );
        }
      }
    }

    if (recordsToMove.length > 0) {
      // Create a new allocation document for the new employee!
      await this.driveRecordModel.create({
        sourceFileId,
        sourceFileName,
        folderPath,
        status: RecordAllocationStatus.ALLOCATED,
        assignedManagerId: manager._id,
        assignedManagerName: managerName,
        assignedEmployeeId: employee._id,
        assignedEmployeeName: employeeName,
        allocatedCount: recordsToMove.length,
        allocatedAt: now,
        allocatedBy: currentUser?._id,
        remarks: remarks || '',
        records: recordsToMove,
        history: [
          {
            action: 'REASSIGNED',
            managerId: manager._id.toString(),
            managerName,
            employeeId: employee._id.toString(),
            employeeName,
            performedBy: currentUser?.email || 'Admin',
            timestamp: now,
            notes: remarks || `Reassigned ${recordsToMove.length} records`,
          },
        ],
      });

      // Record permanent audit log for this reassign
      try {
        await this.driveAllocationLogModel.create({
          action: AllocationActionType.REASSIGNED,
          sourceFileId,
          sourceFileName,
          folderPath,
          count: recordsToMove.length,
          toEmployeeId: employee._id,
          toEmployeeName: employeeName,
          toManagerId: manager._id,
          toManagerName: managerName,
          performedBy: currentUser?.email || currentUser?.name || 'Admin',
          performedById: currentUser?._id,
          remarks: remarks || '',
          recordsSummary: recordsToMove.map((r) => ({
            rowIndex: r.rowIndex,
            customerName: r.customerName,
            phone: r.phone,
            branch: r.branch,
            state: r.state,
            eligibilityAmount: r.eligibilityAmount,
          })),
        });
      } catch (logErr: any) {
        this.logger.warn(`Failed to save reassign log: ${logErr.message}`);
      }
    }

    return {
      message: `Successfully reassigned ${reassignedCount} records to ${employeeName} (Manager: ${managerName})`,
      reassignedCount,
      newManagerName: managerName,
      newEmployeeName: employeeName,
    };
  }

  /**
   * Overall Statistics for Dashboard
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalRecords: number;
    availableRecords: number;
    allocatedRecords: number;
  }> {
    const files = await this.getFilesList();
    let totalRecords = 0;
    let availableRecords = 0;
    let allocatedRecords = 0;

    for (const f of files) {
      totalRecords += f.totalRecords || 0;
      availableRecords += f.availableRecords || 0;
      allocatedRecords += f.allocatedRecords || 0;
    }

    return {
      totalFiles: files.length,
      totalRecords,
      availableRecords,
      allocatedRecords,
    };
  }

  /**
   * Get Permanent Allocation Audit History Logs
   */
  async getAllocationHistory(query: {
    page?: number;
    limit?: number;
    action?: string;
    employeeId?: string;
    fileId?: string;
    search?: string;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    stats: Record<string, { count: number; leads: number }>;
  }> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 25));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.action && query.action !== 'ALL') {
      filter.action = query.action;
    }
    if (query.fileId) {
      filter.sourceFileId = query.fileId;
    }
    if (query.employeeId) {
      const empOid = new Types.ObjectId(query.employeeId);
      filter.$or = [{ toEmployeeId: empOid }, { fromEmployeeId: empOid }];
    }
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const regex = new RegExp(s, 'i');
      const searchConditions = [
        { sourceFileName: regex },
        { toEmployeeName: regex },
        { fromEmployeeName: regex },
        { toManagerName: regex },
        { fromManagerName: regex },
        { performedBy: regex },
        { remarks: regex },
        { 'recordsSummary.customerName': regex },
        { 'recordsSummary.phone': regex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const [data, total, statsGroup] = await Promise.all([
      this.driveAllocationLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.driveAllocationLogModel.countDocuments(filter),
      this.driveAllocationLogModel.aggregate([
        {
          $group: {
            _id: '$action',
            totalActions: { $sum: 1 },
            totalLeads: { $sum: '$count' },
          },
        },
      ]),
    ]);

    const stats: Record<string, { count: number; leads: number }> = {};
    for (const item of statsGroup) {
      if (item._id) {
        stats[item._id] = {
          count: item.totalActions || 0,
          leads: item.totalLeads || 0,
        };
      }
    }

    return {
      data,
      total,
      page,
      limit,
      stats,
    };
  }
}
