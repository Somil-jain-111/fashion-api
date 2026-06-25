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

import { Order } from '../../auth/entities';

@Entity({ name: 'vouchers' })
@Index('idx_voucher_order', ['order'], { unique: true })
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
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
