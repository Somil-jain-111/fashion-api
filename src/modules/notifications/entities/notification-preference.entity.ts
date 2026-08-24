import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';
import { NotificationEventType } from '../enum/notification-event-type.enum';
import { NotificationChannel } from '../enum/notification-channel.enum';

/**
 * Per-user, per-event-type, per-channel opt-out. No row for a (user, event_type, channel)
 * triple means enabled — opt-out model, so nothing needs pre-seeding per user.
 */
@Entity({ name: 'notification_preferences' })
@Index('uq_notification_preferences_user_event_channel', ['user', 'event_type', 'channel'], {
  unique: true,
})
export class NotificationPreferenceEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'event_type', type: 'enum', enum: NotificationEventType })
  event_type!: NotificationEventType;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;
}
