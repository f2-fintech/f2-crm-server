import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private readonly chatModel: Model<ChatMessageDocument>,
  ) {}

  async sendMessage(senderId: string, createDto: CreateMessageDto) {
    const msg = new this.chatModel({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(createDto.receiverId),
      text: createDto.text,
    });
    return await msg.save();
  }

  async getConversation(user1Id: string, user2Id: string) {
    return await this.chatModel.find({
      $or: [
        { senderId: new Types.ObjectId(user1Id), receiverId: new Types.ObjectId(user2Id) },
        { senderId: new Types.ObjectId(user2Id), receiverId: new Types.ObjectId(user1Id) },
      ],
    }).sort({ createdAt: 1 }).lean();
  }

  async markAsRead(user1Id: string, user2Id: string) {
    await this.chatModel.updateMany(
      { senderId: new Types.ObjectId(user2Id), receiverId: new Types.ObjectId(user1Id), isRead: false },
      { $set: { isRead: true } }
    );
    return { success: true };
  }
}
