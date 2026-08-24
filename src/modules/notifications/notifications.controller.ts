import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto, RegisterDeviceDto, RemoveDeviceDto, UpdatePreferenceDto } from './dto';
import { UserStatusGuard } from 'src/default/common/guards/user-status.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard,UserStatusGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@Req() request: any, @Query() query: ListNotificationsQueryDto) {
    const response = await this.notifications.list(
      String(request.user.id),
      query.page,
      query.limit,
      query.unreadOnly
    );
    return DataSanitizer.sanitizeData(response);
  }

  @Get('unread-count')
  async unreadCount(@Req() request: any) {
    const response = await this.notifications.unreadCount(String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post(':id/read')
  async markRead(@Req() request: any, @Param('id') id: string) {
    const response = await this.notifications.markRead(String(request.user.id), id);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('read-all')
  async markAllRead(@Req() request: any) {
    const response = await this.notifications.markAllRead(String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Get('preferences')
  async getPreferences(@Req() request: any) {
    const response = await this.notifications.getPreferences(String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }

  @Post('preferences')
  async updatePreference(@Req() request: any, @Body() dto: UpdatePreferenceDto) {
    const response = await this.notifications.updatePreference(
      String(request.user.id),
      dto.eventType,
      dto.channel,
      dto.enabled
    );
    return DataSanitizer.sanitizeData(response);
  }

  @Post('device-token')
  async registerDevice(@Req() request: any, @Body() dto: RegisterDeviceDto) {
    const response = await this.notifications.registerDevice(
      String(request.user.id),
      dto.deviceToken,
      dto.platform
    );
    return DataSanitizer.sanitizeData(response);
  }

  @Post('device-token/remove')
  async removeDevice(@Req() request: any, @Body() dto: RemoveDeviceDto) {
    const response = await this.notifications.removeDevice(String(request.user.id), dto.deviceToken);
    return DataSanitizer.sanitizeData(response);
  }
}
