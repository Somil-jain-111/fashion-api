import { Module } from '@nestjs/common';
import {
  NotificationsController,
  NotificationTemplatesController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  NotificationRepository,
  NotificationTemplateRepository,
} from './repository/notification.repository';

@Module({
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [NotificationsService, NotificationRepository, NotificationTemplateRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
