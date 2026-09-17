import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'Rahul Sharma',
  })
  @IsString()
  @MaxLength(100)
  applicantName: string;

  @ApiProperty({
    example: '9876543210',
  })
  @IsString()
  @MaxLength(15)
  phone: string;

  @ApiPropertyOptional({
    example: 'rahul@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'Home Loan',
  })
  @IsString()
  loanType: string;

  @ApiProperty({
    example: 2500000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loanAmount: number;

  @ApiPropertyOptional({
    example: 'HDFC Bank',
  })
  @IsOptional()
  @IsString()
  lenderName?: string;

  @ApiPropertyOptional({
    example: 'Noida Branch',
  })
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiPropertyOptional({
    example: 'Application created successfully',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    example: 'LD000001',
  })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({
    example: 'CUS000001',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'OMS000001',
  })
  @IsOptional()
  @IsString()
  omsId?: string;

  @ApiPropertyOptional({
    example: '687b1d6b2f8e5a4a7f9c1111',
  })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;
}