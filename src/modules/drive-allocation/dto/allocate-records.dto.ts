import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AllocateRecordsDto {
  @IsString()
  @IsNotEmpty()
  sourceFileId: string;

  @IsString()
  @IsNotEmpty()
  managerId: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsArray()
  @IsOptional()
  recordIds?: string[];

  @IsNumber()
  @IsOptional()
  @Min(1)
  count?: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  targetSheetName?: string;

  @IsString()
  @IsOptional()
  targetPageId?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @IsOptional()
  cibilMin?: number;

  @IsString()
  @IsOptional()
  lender?: string;

  @IsString()
  @IsOptional()
  customColumn?: string;

  @IsString()
  @IsOptional()
  customValue?: string;

  @IsOptional()
  filters?: any;
}
