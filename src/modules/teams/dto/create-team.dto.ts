import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Sales Team North' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '64d23a1a1f0a1c1234567890', description: 'Manager User ID' })
  @IsNotEmpty()
  @IsMongoId()
  managerId: string;

  @ApiProperty({ example: 'Handles north region sales', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
