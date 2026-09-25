import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateNotionPageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  rows?: any[];

  @IsOptional()
  @IsArray()
  columns?: any[];

  @IsOptional()
  @IsString()
  assignedMemberId?: string;

  @IsOptional()
  content?: any;
}
