import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { NotificationsService } from './notifications.service';
import {
  ListNotificationsQueryDto,
  NotificationActionResponseDto,
  NotificationCountResponseDto,
  NotificationListResponseDto,
  NotificationTemplateResponseDto,
  SaveNotificationTemplateDto,
} from './dto/notification.dto';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SELLER_ADMIN])
@Controller('sellers/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() async list(
    @Req() req: any,
    @Query() query: ListNotificationsQueryDto
  ): Promise<NotificationListResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.list(req.user.id, query)
    ) as NotificationListResponseDto;
  }
  @Get('unread-count') async count(@Req() req: any): Promise<NotificationCountResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.unreadCount(req.user.id)
    ) as NotificationCountResponseDto;
  }
  @Post(':id/read') async read(
    @Req() req: any,
    @Param('id') id: string
  ): Promise<NotificationActionResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.markRead(req.user.id, Number(id))
    ) as NotificationActionResponseDto;
  }
  @Post('read-all') async readAll(@Req() req: any): Promise<NotificationActionResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.markAllRead(req.user.id)
    ) as NotificationActionResponseDto;
  }
}

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller(['super-admin/notification-templates', 'admin/notification-templates'])
export class NotificationTemplatesController {
  constructor(private readonly service: NotificationsService) {}
  @Get() async list(): Promise<NotificationTemplateResponseDto[]> {
    return DataSanitizer.sanitizeData(
      await this.service.listTemplates()
    ) as NotificationTemplateResponseDto[];
  }
  @Post() async create(
    @Body() dto: SaveNotificationTemplateDto
  ): Promise<NotificationTemplateResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.createTemplate(dto)
    ) as NotificationTemplateResponseDto;
  }
  @Post(':id') async update(
    @Param('id') id: string,
    @Body() dto: SaveNotificationTemplateDto
  ): Promise<NotificationTemplateResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.updateTemplate(Number(id), dto)
    ) as NotificationTemplateResponseDto;
  }
}
