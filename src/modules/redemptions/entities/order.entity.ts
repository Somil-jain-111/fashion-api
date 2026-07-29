import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';

import {
  Voucher,
  PointHistory,
  User,
  ShippingDetail,
  OrderStatusHistory,
  OrderItem,
} from '../../auth/entities';

import { OrderStatus } from '../enum/order-status.enum';

@Entity({ name: 'orders' })
@Index('idx_order_user', ['user'])
@Index('idx_order_status', ['status'])
@Index('idx_order_created', ['created_at'])
@Index('idx_order_number', ['order_number'])
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  order_number!: string;

  @Column({ type: 'float', default: 0 })
  total_points!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  order_type!: string;

  @Column({ type: 'date', nullable: true })
  order_date?: Date | null;

  @Column({ type: 'date', nullable: true })
  estimated_date?: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product_id?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product_name?: string | null;

  @Column({ type: 'text', nullable: true })
  product_remarks?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  product_sku?: string | null;

  @Column({ type: 'float', default: 0 })
  price_point!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  short_desc?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  rating?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_image_url?: string | null;

  @Column({ type: 'float', default: 0 })
  cost!: number;

  @Column({ type: 'float', default: 0 })
  mrp!: number;

  @Column({ type: 'bigint', nullable: true })
  parent_id?: bigint | null;

  @Column({ type: 'float', default: 0 })
  user_remaining_points!: number;

  @Column({ type: 'tinyint', default: 0 })
  tds_percentage!: number;

  @Column({ type: 'float', default: 0 })
  taxable_points!: number;

  @Column({ type: 'float', default: 0 })
  grand_total_points!: number;

  @Column({ type: 'float', default: 0 })
  tds_points!: number;

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

  @Column({ type: 'bigint' })
  user_id!: string;
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

  @OneToOne(() => ShippingDetail, (shipping) => shipping.order, {
    cascade: true,
  })
  shippingDetail!: ShippingDetail;

  @OneToOne(() => Voucher, (voucher) => voucher.order, {
    nullable: true,
  })
  voucher?: Voucher | null;

  @OneToMany(() => PointHistory, (pointHistory) => pointHistory.order)
  pointHistory?: PointHistory[];

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory?: OrderStatusHistory[];

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;

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
