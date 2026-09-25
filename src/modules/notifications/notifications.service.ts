import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createNotification(payload: {
    recipient: string;
    title: string;
    message: string;
    type: string;
    relatedPageId?: string;
  }) {
    const notification = new this.notificationModel(payload);
    return notification.save();
  }

  async getForUser(userId: string) {
    return this.notificationModel
      .find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('relatedPageId', 'title pageType')
      .lean();
  }

  async markAsRead(notificationId: string, userId: string) {
    const updated = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}
