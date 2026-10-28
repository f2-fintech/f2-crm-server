import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCallLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  process_id?: number;

  @IsOptional()
  @IsString()
  report_type?: string;

  @IsOptional()
  @IsString()
  campaigns?: string;

  @IsOptional()
  @IsString()
  agent?: string;

  @IsOptional()
  @IsString()
  from_date?: string;

  @IsOptional()
  @IsString()
  from_date_to?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
