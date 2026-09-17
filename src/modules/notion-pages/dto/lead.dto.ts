import { IsArray, IsNotEmpty, IsMongoId } from 'class-validator';

export class BulkImportLeadsDto {
  @IsNotEmpty()
  @IsArray()
  leads: Record<string, any>[];
}

export class AssignLeadDto {
  @IsNotEmpty()
  @IsMongoId()
  assignedTo: string;
}
