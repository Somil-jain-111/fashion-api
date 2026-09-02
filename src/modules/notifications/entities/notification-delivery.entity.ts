import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';
import { NotificationChannel } from './notification-template.entity';

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Entity('notification_deliveries')
@Index(['status', 'nextAttemptAt'])
@Index(['notificationId', 'channel'], { unique: true })
export class NotificationDelivery extends BaseEntity {
  @Column({ type: 'bigint', name: 'notification_id' }) notificationId!: number;
  @Column({ type: 'enum', enum: NotificationChannel }) channel!: NotificationChannel;
  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    default: NotificationDeliveryStatus.PENDING,
  })
  status!: NotificationDeliveryStatus;
  @Column({ type: 'int', default: 0, name: 'attempt_count' }) attemptCount!: number;
  @Column({ type: 'datetime', nullable: true, name: 'next_attempt_at' })
  nextAttemptAt?: Date | null;
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'provider_message_id' })
  providerMessageId?: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'last_error' }) lastError?:
    string | null;
}
