import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { NotificationEventType } from '../enum/notification-event-type.enum';

/**
 * One row per event type. `title`/`body` support `{{placeholder}}` substitution, rendered by
 * NotificationsService at send time and snapshotted onto the resulting `notifications` row —
 * editing a template here doesn't retroactively rewrite history.
 */
@Entity({ name: 'notification_templates' })
@Index('uq_notification_templates_event_type', ['event_type'], { unique: true })
export class NotificationTemplateEntity extends BaseEntity {
  @Column({ name: 'event_type', type: 'enum', enum: NotificationEventType })
  event_type!: NotificationEventType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 1000 })
  body!: string;
}
