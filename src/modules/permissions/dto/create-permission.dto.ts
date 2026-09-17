import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  module: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  action: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  key: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}