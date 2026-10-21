import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReassignRecordsDto {
  @IsArray()
  @IsNotEmpty()
  recordIds: string[];

  @IsString()
  @IsNotEmpty()
  managerId: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ReturnRecordsDto {
  @IsArray()
  @IsNotEmpty()
  recordIds: string[];

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ConfigureDriveDto {
  @IsString()
  @IsNotEmpty()
  folderUrl: string;
}
