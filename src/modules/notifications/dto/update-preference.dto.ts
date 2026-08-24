import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationEventType } from '../enum/notification-event-type.enum';
import { NotificationChannel } from '../enum/notification-channel.enum';

export class UpdatePreferenceDto {
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}
