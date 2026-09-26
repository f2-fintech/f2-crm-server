import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { NotionPagesService } from './notion-pages.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IsOptional, IsString } from 'class-validator';
import { UpdateNotionPageDto } from './dto/update-notion-page.dto';

export class AcceptInviteDto {
  @IsString()
  token: string;
}

export class CreatePageDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  pageType?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ShareEmailDto {
  @IsString()
  email: string;
}

export class CloneFormatDto {
  @IsOptional()
  @IsString()
  targetParentId?: string;
}

@Controller('notion-pages')
@UseGuards(AuthGuard('jwt'))
export class NotionPagesController {
  constructor(private readonly pagesService: NotionPagesService) {}

  @Get('tree')
  getTree(@Req() req: Request) {
    return this.pagesService.getTree(req.user);
  }

  @Post('accept-invite')
  acceptInvite(@Body() body: AcceptInviteDto) {
    return this.pagesService.acceptInvite(body.token);
  }

  @Get('deleted')
  getDeletedPages(@Req() req: Request) {
    return this.pagesService.getDeletedPages(req.user);
  }

  @Get(':id/activity-log')
  getActivityLog(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.getActivityLog(id, req.user);
  }

  @Get(':id')
  getPageById(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.getPageById(id, req.user);
  }

  @Patch(':id/restore')
  restorePage(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.restorePage(id, req.user);
  }

  @Post()
  createPage(@Body() createDto: CreatePageDto, @Req() req: Request) {
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
  shareEmail(@Param('id') id: string, @Body() body: ShareEmailDto) {
    return this.pagesService.shareEmail(id, body.email);
  }

  @Post(':id/clone')
  cloneFormat(@Param('id') id: string, @Body() body: CloneFormatDto) {
    return this.pagesService.cloneFormat(id, body.targetParentId);
  }

  @Delete(':id')
  deletePage(@Param('id') id: string, @Req() req: Request) {
    return this.pagesService.deletePage(id, req.user);
  }
}