import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from 'src/default/config/config.module';
import { AppConfigService } from 'src/default/config/config.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  NotificationDeliveryRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  UserDeviceRepository,
} from './repository';
import { FirebasePushProvider } from './providers/firebase-push.provider';
import { NotificationDispatchProcessor } from './processors/notification-dispatch.processor';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST') || '127.0.0.1',
          port: Number(config.get('REDIS_PORT')) || 6379,
          password: config.get('REDIS_PASSWORD') || undefined,
          db: Number(config.get('REDIS_DB')) || 0,
        },
      }),
    }),
    BullModule.registerQueue({ name: 'notification-dispatch' }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,
    NotificationDeliveryRepository,
    UserDeviceRepository,
    FirebasePushProvider,
    NotificationDispatchProcessor,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
