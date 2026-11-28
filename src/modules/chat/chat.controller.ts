import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async sendMessage(@Body() createDto: CreateMessageDto, @Req() req: any) {
    return await this.chatService.sendMessage(req.user._id, createDto);
  }

  @Get('summary')
  async getChatSummary(@Req() req: any) {
    return await this.chatService.getChatSummary(req.user._id);
  }

  @Get('channel/:channelId')
  async getChannelMessages(@Param('channelId') channelId: string) {
    return await this.chatService.getChannelMessages(channelId);
  }

  @Post('channel/:channelId')
  async sendChannelMessage(
    @Param('channelId') channelId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return await this.chatService.sendChannelMessage(
      req.user._id,
      channelId,
      body,
    );
  }

  @Get(':userId')
  async getConversation(@Param('userId') userId: string, @Req() req: any) {
    return await this.chatService.getConversation(req.user._id, userId);
  }

  @Patch(':userId/read')
  async markAsRead(@Param('userId') userId: string, @Req() req: any) {
    return await this.chatService.markAsRead(req.user._id, userId);
  }
}
