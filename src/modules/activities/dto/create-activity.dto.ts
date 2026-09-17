import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  ActivityStatus,
  ActivityType,
} from '../schema/activity.schema';

export class CreateActivityDto {
  @IsMongoId()
  @IsNotEmpty()
  leadId: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsMongoId()
  applicationId?: string;

  @IsMongoId()
  @IsNotEmpty()
  assignedTo: string;

  @IsEnum(ActivityType)
  activityType: ActivityType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  activityDate: Date;

  @IsOptional()
  @IsString()
  activityTime?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];

  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @IsOptional()
  @IsMongoId()
  updatedBy?: string;
}