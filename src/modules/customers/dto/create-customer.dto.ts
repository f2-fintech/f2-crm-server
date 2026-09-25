import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'Rahul Sharma',
  })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: '9876543210',
  })
  @IsString()
  @MaxLength(15)
  phone: string;

  @ApiPropertyOptional({
    example: '9876543211',
  })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  alternatePhone?: string;

  @ApiPropertyOptional({
    example: 'rahul@gmail.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'Bareilly',
  })
  @IsString()
  city: string;

  @ApiPropertyOptional({
    example: 'Bareilly',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'House No. 101, Rohini',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'ABCDE1234F',
  })
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional({
    example: '123412341234',
  })
  @IsOptional()
  @IsString()
  aadhaar?: string;

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
    example: 'Private Employee',
  })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({
    example: 'Infosys Ltd.',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'Lead converted successfully',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @ApiPropertyOptional({
    example: '687b1d6b2f8e5a4a7f9c1111',
  })
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiPropertyOptional({
    example: '687b1d6b2f8e5a4a7f9c2222',
  })
  @IsOptional()
  @IsMongoId()
  relationshipManager?: string;

  // Lead Conversion References

  @ApiPropertyOptional({
    example: 'LD000001',
  })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional({
    example: 'APP000001',
  })
  @IsOptional()
  @IsString()
  applicationId?: string;

  @ApiPropertyOptional({
    example: 'OMS000001',
  })
  @IsOptional()
  @IsString()
  omsId?: string;
}