import { Entity, Column, JoinColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { PointHistory, User, OrderStatusHistory, OrderItem } from '../../auth/entities';

import { OrderStatus } from '../enum/order-status.enum';
import { BaseEntity } from '../../../default/common/entities';
import { ParentOrderType } from '../enum/order-type.enum';

@Entity({ name: 'orders' })
@Index('idx_order_user', ['user'])
@Index('idx_order_status', ['status'])
@Index('idx_order_created', ['createdAt'])
export class Order extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  order_number!: string;

  @Column({ type: 'int', default: 0, name: 'total_items' })
  totalItems!: number;

  @Column({ type: 'enum', enum: ParentOrderType, default: ParentOrderType.SINGLE })
  order_type!: ParentOrderType;

  @Column({ type: 'date', nullable: true })
  order_date?: Date | null;

  @Column({ type: 'date', nullable: true })
  estimated_date?: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ type: 'float', default: 0 })
  user_remaining_points!: number;

  @Column({ type: 'float', default: 0 })
  total_points!: number;

  @Column({ type: 'tinyint', default: 0 })
  tds_percentage!: number;

  @Column({ type: 'float', default: 0 })
  taxable_points!: number;

  @Column({ type: 'float', default: 0 })
  tds_points!: number;

  @Column({ type: 'float', default: 0 })
  grand_total_points!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_id?: string | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ORDER_REVIEW,
  })
  status!: OrderStatus;

  @Column({ type: 'varchar', name: 'error_message', nullable: true })
  errorMessage?: string | null;

  @ManyToOne(() => User, (user) => user.orders, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'created_by' })
  order_placedBy?: User | null;

  @OneToMany(() => PointHistory, (pointHistory) => pointHistory.order)
  pointHistory?: PointHistory[];

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory?: OrderStatusHistory[];

  @Column({ name: 'redemption_otp', type: 'varchar', length: 10, nullable: true })
  redemption_otp: string;

  @Column({
    name: 'redemption_otp_ref_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  redemption_otp_ref_id: string;

  @Column({
    name: 'redemption_otp_expired_at',
    type: 'timestamp',
    nullable: true,
  })
  redemption_otp_expired_at: Date;

  @Column({
    name: 'redemption_otp_mobile',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  redemption_otp_mobile: string;

  @Column({
    name: 'redemption_otp_receiver_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  redemption_otp_receiver_type: string;
}
