import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';

export enum NotificationCategory {
  ORDERS = 'ORDERS',
  PRODUCT_APPROVAL = 'PRODUCT_APPROVAL',
  REVIEWS = 'REVIEWS',
  BOOST = 'BOOST',
  PAYMENTS = 'PAYMENTS',
  KYC = 'KYC',
  SYSTEM = 'SYSTEM',
}

@Entity('notifications')
@Index(['recipientId', 'readAt', 'createdAt'])
@Index(['recipientId', 'category', 'createdAt'])
@Index(['dedupeKey'], { unique: true })
export class Notification extends BaseEntity {
  @Column({ type: 'bigint', name: 'recipient_id' }) recipientId!: number;
  @Column({ type: 'varchar', length: 100, name: 'template_code' }) templateCode!: string;
  @Column({ type: 'enum', enum: NotificationCategory }) category!: NotificationCategory;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'varchar', length: 80, nullable: true, name: 'resource_type' }) resourceType?:
    string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'resource_id' }) resourceId?:
    string | null;
  @Column({ type: 'json', nullable: true }) metadata?: Record<string, unknown> | null;
  @Column({ type: 'varchar', length: 180, nullable: true, name: 'dedupe_key' }) dedupeKey?:
    string | null;
  @Column({ type: 'datetime', nullable: true, name: 'read_at' }) readAt?: Date | null;
  @Column({ type: 'datetime', nullable: true, name: 'expires_at' }) expiresAt?: Date | null;
}
