import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  FollowUpPriority,
  FollowUpStatus,
} from '../schemas/follow-up.schema';

export class FollowUpQueryDto {
  @ApiPropertyOptional({
    default: 1,
  })
  @IsOptional()
  @IsNumberString()
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
  })
  @IsOptional()
  @IsNumberString()
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: FollowUpStatus,
  })
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @ApiPropertyOptional({
    enum: FollowUpPriority,
  })
  @IsOptional()
  @IsEnum(FollowUpPriority)
  priority?: FollowUpPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  leadId?: string;

  @ApiPropertyOptional({
    default: 'followUpDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'followUpDate';

  @ApiPropertyOptional({
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}