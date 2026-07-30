import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  JoinColumn,
  OneToOne,
  Index,
} from 'typeorm';

import { Order, OrderItem } from '../../auth/entities';

@Entity({ name: 'vouchers' })
@Index('idx_voucher_order', ['order'], { unique: false })
@Index('idx_voucher_coupon', ['coupon_code'], { unique: true })
export class Voucher extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @Column({ type: 'varchar', length: 255, unique: true })
  coupon_code!: string;

  @Column({ type: 'varchar', length: 255 })
  v_pin!: string;

  @Column({ type: 'timestamp' })
  expiry_date!: Date;

  @OneToOne(() => Order, (order) => order.voucher, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @OneToOne(() => OrderItem, (orderItem) => orderItem.voucher, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem?: OrderItem | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
