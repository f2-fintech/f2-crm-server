import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

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
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
  })
  headOfDepartment?: Types.ObjectId;

  @Prop({
    default: true,
  })
  isActive: boolean;
}

export const DepartmentSchema =
  SchemaFactory.createForClass(Department);