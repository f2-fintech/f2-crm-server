import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  FollowUpMode,
  FollowUpPriority,
} from '../schemas/follow-up.schema';

export class CreateFollowUpDto {
  @ApiProperty({
    example: '6878c34fdcc72b12f53e1234',
  })
  @IsMongoId()
  leadId: string;

  @ApiPropertyOptional({
    example: '6878c34fdcc72b12f53e5678',
  })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({
    example: '6878c34fdcc72b12f53e9876',
  })
  @IsOptional()
  @IsMongoId()
  applicationId?: string;

  @ApiProperty({
    example: '6878c34fdcc72b12f53e4321',
  })
  @IsMongoId()
  assignedTo: string;

  @ApiProperty({
    example: '2026-07-20',
  })
  @IsDateString()
  followUpDate: Date;

  @ApiProperty({
    example: '11:30 AM',
  })
  @IsString()
  @IsNotEmpty()
  followUpTime: string;

  @ApiProperty({
    enum: FollowUpMode,
  })
  @IsEnum(FollowUpMode)
  mode: FollowUpMode;

  @ApiProperty({
    enum: FollowUpPriority,
  })
  @IsEnum(FollowUpPriority)
  priority: FollowUpPriority;

  @ApiPropertyOptional({
    example: 'Customer requested callback tomorrow.',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    example: '2026-07-22',
  })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: Date;
}