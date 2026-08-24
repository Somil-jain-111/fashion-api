import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NotificationEventType } from 'src/modules/notifications/enum/notification-event-type.enum';

export class CreateNotificationTemplateDto {
  @IsEnum(NotificationEventType)
  eventType!: NotificationEventType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  body!: string;
}
