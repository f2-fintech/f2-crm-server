import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatMessage,
  ChatMessageDocument,
} from './schemas/chat-message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private readonly chatModel: Model<ChatMessageDocument>,
  ) {}

  async sendMessage(senderId: string, createDto: CreateMessageDto) {
    const msg = new this.chatModel({
      senderId: new Types.ObjectId(senderId),
      receiverId: new Types.ObjectId(createDto.receiverId),
      text: createDto.text,
    });
    return await msg.save();
  }

  async sendChannelMessage(
    senderId: string,
    channelId: string,
    data: {
      text?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    },
  ) {
    const msg = new this.chatModel({
      senderId: new Types.ObjectId(senderId),
      channelId,
      text: data.text || '',
      attachmentUrl: data.attachmentUrl,
      attachmentType: data.attachmentType,
      attachmentName: data.attachmentName,
    });
    return await msg.save();
  }

  async getChannelMessages(channelId: string) {
    const messages = await this.chatModel
      .find({ channelId })
      .populate('senderId', 'firstName lastName role profilePicture')
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    return messages.map((m: any) => ({
      _id: m._id,
      senderId: m.senderId?._id || m.senderId,
      channelId: m.channelId,
      senderName: m.senderId
        ? `${m.senderId.firstName || ''} ${m.senderId.lastName || ''}`.trim()
        : 'Team Member',
      senderRole:
        (typeof m.senderId?.role === 'object'
          ? m.senderId?.role?.name
          : m.senderId?.role) || 'Member',
      senderAvatar: m.senderId?.profilePicture,
      text: m.text || '',
      attachmentUrl: m.attachmentUrl,
      attachmentType: m.attachmentType,
      attachmentName: m.attachmentName,
      createdAt: (m as any).createdAt,
    }));
  }

  async getConversation(user1Id: string, user2Id: string) {
    return await this.chatModel
      .find({
        $or: [
          {
            senderId: new Types.ObjectId(user1Id),
            receiverId: new Types.ObjectId(user2Id),
          },
          {
            senderId: new Types.ObjectId(user2Id),
            receiverId: new Types.ObjectId(user1Id),
          },
        ],
      })
      .sort({ createdAt: 1 })
      .lean();
  }

  async markAsRead(user1Id: string, user2Id: string) {
    await this.chatModel.updateMany(
      {
        senderId: new Types.ObjectId(user2Id),
        receiverId: new Types.ObjectId(user1Id),
        isRead: false,
      },
      { $set: { isRead: true } },
    );
    return { success: true };
  }

  async getChatSummary(userId: string) {
    const id = new Types.ObjectId(userId);
    const messages = await this.chatModel
      .find({
        $or: [{ senderId: id }, { receiverId: id }],
      })
      .sort({ createdAt: -1 })
      .lean();

    const summary = {};
    for (const msg of messages) {
      if (!msg.receiverId) continue;
      const otherUser =
        msg.senderId.toString() === userId
          ? msg.receiverId.toString()
          : msg.senderId.toString();
      if (!summary[otherUser]) {
        summary[otherUser] = {
          lastMessage: msg.text,
          lastMessageAt: (msg as any).createdAt,
          unreadCount: 0,
        };
      }
      if (msg.receiverId.toString() === userId && !msg.isRead) {
        summary[otherUser].unreadCount++;
      }
    }
    return summary;
  }
}
