import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LifecycleEventType, LifecycleEventSource } from '../enums/lifecycle.enum';

export class LifecycleQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: LifecycleEventType })
  @IsOptional()
  @IsEnum(LifecycleEventType)
  eventType?: LifecycleEventType;

  @ApiPropertyOptional({ enum: LifecycleEventSource })
  @IsOptional()
  @IsEnum(LifecycleEventSource)
  source?: LifecycleEventSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromStage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toStage?: string;
}
