import { Module } from '@nestjs/common';
import { AuditModule } from 'src/modules/audit/audit.module';
import { NotificationTemplateRepository } from 'src/modules/notifications/repository/notification-template.repository';
import { SuperAdminNotificationTemplatesController } from './super-admin-notification-templates.controller';
import { SuperAdminNotificationTemplatesService } from './super-admin-notification-templates.service';

@Module({
  imports: [AuditModule],
  controllers: [SuperAdminNotificationTemplatesController],
  providers: [NotificationTemplateRepository, SuperAdminNotificationTemplatesService],
})
export class SuperAdminNotificationTemplatesModule {}
