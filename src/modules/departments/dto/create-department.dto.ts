import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  departmentCode: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  departmentName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  headOfDepartment?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}