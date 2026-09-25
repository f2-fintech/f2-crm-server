import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotionPagesController } from './notion-pages.controller';
import { NotionPagesService } from './notion-pages.service';
import { NotionPage, NotionPageSchema } from './schemas/notion-page.schema';
import { NotionLead, NotionLeadSchema } from './schemas/notion-lead.schema';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';

import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotionPage.name, schema: NotionPageSchema },
      { name: NotionLead.name, schema: NotionLeadSchema },
    ]),
    UsersModule,
    TeamsModule,
    NotificationsModule,
    MailModule,
  ],
  controllers: [NotionPagesController],
  providers: [NotionPagesService],
  exports: [NotionPagesService],
})
export class NotionPagesModule {}
