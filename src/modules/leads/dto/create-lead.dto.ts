import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  loanType?: string;

  @IsNumber()
  @IsOptional()
  loanAmount?: number;
}
