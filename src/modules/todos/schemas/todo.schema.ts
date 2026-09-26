import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type TodoDocument = HydratedDocument<Todo>;

@Schema({
  timestamps: true,
  collection: 'todos',
})
export class Todo {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  date: string; // Storing as YYYY-MM-DD or string for easy querying

  @Prop({ default: false })
  completed: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId: MongooseSchema.Types.ObjectId;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
