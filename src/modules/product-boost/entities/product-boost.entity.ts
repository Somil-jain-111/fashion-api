import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';

export enum BoostTargetType {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
}

export enum BoostOrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

@Entity('product_boost_orders')
@Index(['sellerId', 'status'])
export class ProductBoostOrder extends BaseEntity {
  @Column({ type: 'varchar', length: 36, unique: true, name: 'public_id' })
  publicId!: string;

  @Column({ type: 'bigint', name: 'seller_id' })
  sellerId!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'char', length: 3, default: 'INR' })
  currency!: string;

  @Column({ type: 'enum', enum: BoostOrderStatus, default: BoostOrderStatus.PENDING_PAYMENT })
  status!: BoostOrderStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true, name: 'payment_id' })
  paymentId?: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt?: Date | null;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt!: Date;

  @OneToMany(() => ProductBoostOrderItem, (item) => item.order)
  items!: ProductBoostOrderItem[];
}

@Entity('product_boost_order_items')
@Index(['productId'])
export class ProductBoostOrderItem extends BaseEntity {
  @Column({ type: 'bigint', name: 'order_id' })
  orderId!: number;

  @ManyToOne(() => ProductBoostOrder, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order!: ProductBoostOrder;

  @Column({ type: 'bigint', name: 'product_id' })
  productId!: number;

  @Column({ type: 'bigint', name: 'category_id' })
  categoryId!: number;

  @Column({ type: 'enum', enum: BoostTargetType, name: 'target_type' })
  targetType!: BoostTargetType;

  @Column({ type: 'int', name: 'duration_days' })
  durationDays!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'line_amount' })
  lineAmount!: number;
}

@Entity('product_boost_campaigns')
@Index(['productId', 'startsAt', 'endsAt'])
@Index(['categoryId', 'startsAt', 'endsAt'])
export class ProductBoostCampaign extends BaseEntity {
  @Column({ type: 'bigint', name: 'order_id' })
  orderId!: number;

  @Column({ type: 'bigint', unique: true, name: 'order_item_id' })
  orderItemId!: number;

  @Column({ type: 'bigint', name: 'seller_id' })
  sellerId!: number;

  @Column({ type: 'bigint', name: 'product_id' })
  productId!: number;

  @Column({ type: 'bigint', name: 'category_id' })
  categoryId!: number;

  @Column({ type: 'enum', enum: BoostTargetType, name: 'target_type' })
  targetType!: BoostTargetType;

  @Column({ type: 'datetime', name: 'starts_at' })
  startsAt!: Date;

  @Column({ type: 'datetime', name: 'ends_at' })
  endsAt!: Date;
}
