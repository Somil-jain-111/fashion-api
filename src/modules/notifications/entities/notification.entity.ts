import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';
import { NotificationEventType } from '../enum/notification-event-type.enum';

/**
 * The actual notification log — one row per notification a user received. `title`/`body` are
 * the rendered snapshot at send time, not a live reference to the template. `reference_type`/
 * `reference_id` point at whatever business record triggered it (invoice, order, redemption,
 * distributor return) without a hard FK, since those live in different modules/tables.
 */
@Entity({ name: 'notifications' })
@Index('idx_notifications_user_id', ['user'])
@Index('idx_notifications_event_type', ['event_type'])
export class NotificationEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'event_type', type: 'enum', enum: NotificationEventType })
  event_type!: NotificationEventType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 1000 })
  body!: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  reference_type?: string;

  @Column({ name: 'reference_id', type: 'varchar', length: 100, nullable: true })
  reference_id?: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  is_read!: boolean;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  read_at?: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;
}
