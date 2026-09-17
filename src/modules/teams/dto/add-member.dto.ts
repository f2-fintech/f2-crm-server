import { IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ example: '64d23a1a1f0a1c1234567890', description: 'User ID to add to team' })
  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @ApiProperty({ example: '64d23a1a1f0a1c1234567891', description: 'User ID of the manager/team leader this user reports to', required: false })
  @IsOptional()
  @IsMongoId()
  reportsTo?: string;
}
