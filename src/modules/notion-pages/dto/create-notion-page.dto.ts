import { IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';

export class CreateNotionPageDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @IsMongoId()
  parentPageId?: string;
}
