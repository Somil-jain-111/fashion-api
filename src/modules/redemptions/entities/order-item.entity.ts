import { Entity, Column, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';

import { Order, ShippingDetail, Voucher } from '../../auth/entities';
import { OrderStatus } from '../enum/order-status.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'order_items' })
@Index('idx_order_item_order', ['order'])
@Index('idx_order_item_status', ['status'])
@Index('idx_order_item_number', ['orderNumber'])
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'varchar', length: 100, nullable: false, name: 'order_number' })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'product_id' })
  productId!: string;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'product_name' })
  productName!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    default: 'digital',
    name: 'product_type',
  })
  productType!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'product_sku' })
  productSku?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'product_image_url' })
  productImageUrl?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'short_desc' })
  shortDesc?: string | null;

  @Column({ type: 'float', default: 0, name: 'price_point' })
  pricePoint!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'float', default: 0, name: 'total_points' })
  totalPoints!: number;

  @Column({ type: 'float', default: 0 })
  cost!: number;

  @Column({ type: 'float', default: 0 })
  mrp!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ORDER_REVIEW,
  })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'transaction_id' })
  transactionId?: string | null;

  @Column({ type: 'varchar', name: 'error_message', nullable: true })
  errorMessage?: string | null;

  @OneToOne(() => Voucher, (voucher) => voucher.orderItem, {
    nullable: true,
    cascade: true,
  })
  voucher?: Voucher | null;

  @OneToOne(() => ShippingDetail, (shipping) => shipping.orderItem, {
    cascade: true,
  })
  shippingDetail!: ShippingDetail;
}
