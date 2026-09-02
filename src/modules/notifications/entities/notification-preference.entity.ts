import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';
import { NotificationCategory } from './notification.entity';
import { NotificationChannel } from './notification-template.entity';

@Entity('notification_preferences')
@Index(['userId', 'category', 'channel'], { unique: true })
export class NotificationPreference extends BaseEntity {
  @Column({ type: 'bigint', name: 'user_id' }) userId!: number;
  @Column({ type: 'enum', enum: NotificationCategory }) category!: NotificationCategory;
  @Column({ type: 'enum', enum: NotificationChannel }) channel!: NotificationChannel;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
}
