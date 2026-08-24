import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationEntity } from './notification.entity';
import { NotificationChannel, NotificationDeliveryStatus } from '../enum/notification-channel.enum';

/**
 * One row per channel attempted for a notification — IN_APP is always SENT immediately (the
 * `notifications` row itself is the delivery); PUSH tracks PENDING -> SENT/FAILED/SKIPPED as
 * FirebasePushProvider actually attempts it, with attempts/last_error for visibility into
 * BullMQ retries.
 */
@Entity({ name: 'notification_deliveries' })
@Index('idx_notification_deliveries_notification_id', ['notification'])
export class NotificationDeliveryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => NotificationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id' })
  notification!: NotificationEntity;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.PENDING,
  })
  status!: NotificationDeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
  last_error?: string;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sent_at?: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
