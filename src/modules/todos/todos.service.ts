import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Todo, TodoDocument } from './schemas/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private readonly todoModel: Model<TodoDocument>,
  ) {}

  async create(userId: string, createTodoDto: CreateTodoDto): Promise<Todo> {
    const newTodo = new this.todoModel({
      ...createTodoDto,
      userId,
    });
    return newTodo.save();
  }

  async findAll(userId: string): Promise<Todo[]> {
    return this.todoModel.find({ userId: new Types.ObjectId(userId) } as any).sort({ createdAt: -1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<Todo> {
    const todo = await this.todoModel.findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) } as any).exec();
    if (!todo) {
      throw new NotFoundException(`Todo #${id} not found`);
    }
    return todo;
  }

  async update(
    userId: string,
    id: string,
    updateTodoDto: UpdateTodoDto,
  ): Promise<Todo> {
    const existingTodo = await this.todoModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) } as any,
        updateTodoDto,
        { new: true }
      )
      .exec();

    if (!existingTodo) {
      throw new NotFoundException(`Todo #${id} not found`);
    }
    return existingTodo as unknown as Todo;
  }

  async remove(userId: string, id: string): Promise<Todo> {
    const deletedTodo = await this.todoModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) } as any)
      .exec();

    if (!deletedTodo) {
      throw new NotFoundException(`Todo #${id} not found`);
    }
    return deletedTodo as unknown as Todo;
  }
}
