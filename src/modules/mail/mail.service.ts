import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private appUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  /**
   * Sends an email notification when a Notion page is assigned to a user.
   */
  async sendPageAssignmentEmail(userEmail: string, userName: string, pageTitle: string, pageId: string) {
    const pageUrl = `${this.appUrl}/notion-pages?page=${pageId}`;
    
    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: `[F2 CRM] You have been assigned to: ${pageTitle}`,
        text: `Hello ${userName},\n\nYou have been assigned to a new page: "${pageTitle}".\n\nClick here to view it: ${pageUrl}\n\nBest,\nF2 CRM Team`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #2383e2;">New Page Assignment</h2>
            <p>Hello <strong>${userName}</strong>,</p>
            <p>You have been assigned to the page: <strong>${pageTitle}</strong></p>
            <a href="${pageUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2383e2; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">
              View Page
            </a>
            <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${pageUrl}">${pageUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;">
            <p style="font-size: 0.8em; color: #aaa;">This is an automated message from F2 CRM.</p>
          </div>
        `,
      });
      this.logger.log(`Assignment email sent successfully to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send assignment email to ${userEmail}`, error);
    }
  }

  /**
   * Sends an email invitation to collaborate on a Notion page.
   */
  async sendPageInviteEmail(email: string, token: string) {
    const inviteUrl = `${this.appUrl}/notion-pages?token=${token}`;
    
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `[F2 CRM] Invitation to collaborate on a Page`,
        text: `You have been invited to collaborate on a page.\n\nClick here to accept: ${inviteUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #2383e2;">Page Invitation</h2>
            <p>You have been invited to collaborate on a page in F2 CRM.</p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2383e2; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">
              Accept Invitation
            </a>
          </div>
        `,
      });
      this.logger.log(`Invite email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${email}`, error);
    }
  }
}
