import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department>;

@Schema({
  timestamps: true,
  collection: 'departments',
})
export class Department {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 20,
  })
  departmentCode: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
  })
  departmentName: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 500,
  })
  description: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 100,
  })
  headOfDepartment: string;

  @Prop({
    default: true,
  })
  isActive: boolean;
}

export const DepartmentSchema =
  SchemaFactory.createForClass(Department);