import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { NotionPagesService } from './notion-pages.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { UpdateNotionPageDto } from './dto/update-notion-page.dto';

@Controller('notion-pages')
@UseGuards(AuthGuard('jwt'))
export class NotionPagesController {
  constructor(private readonly pagesService: NotionPagesService) {}

  @Get('tree')
  getTree(@Req() req: Request) {
    return this.pagesService.getTree(req.user);
  }

  @Post('accept-invite')
  acceptInvite(@Body() body: any) {
    return this.pagesService.acceptInvite(body.token);
  }

  @Get(':id')
  getPageById(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.getPageById(id, req.user);
  }

  @Post()
  createPage(@Body() createDto: any, @Req() req: Request) {
    return this.pagesService.createPage(createDto, req.user);
  }

  @Patch(':id')
  updatePage(@Param('id') id: string, @Body() updateData: UpdateNotionPageDto, @Req() req: Request) {
    return this.pagesService.updatePage(id, updateData, req.user);
  }

  // Admin/Super Admin only — enforced inside the service, not just by this route existing.
  @Patch(':id/clear')
  clearPageData(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.clearPageData(id, req.user);
  }

  @Post(':id/share-email')
  shareEmail(@Param('id') id: string, @Body() body: any) {
    return this.pagesService.shareEmail(id, body.email);
  }

  @Post(':id/clone')
  cloneFormat(@Param('id') id: string, @Body() body: any) {
    return this.pagesService.cloneFormat(id, body.targetParentId);
  }

  @Delete(':id')
  deletePage(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.deletePage(id, req.user);
  }
}