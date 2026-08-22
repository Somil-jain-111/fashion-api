import { Entity, Column, ManyToOne, JoinColumn, Index, OneToOne } from 'typeorm';
//
import { InvoiceEntity, Order, User } from '../../auth/entities';
import { Payout } from '../../payment/entities/payout.entity';
import { RedemptionType } from '../enum/redemption-type.enum';
import { PointStatusEnum } from '../enum/point-history-status.enum.';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'point_histories' })
@Index('idx_point_user', ['user'])
@Index('idx_point_status', ['status'])
@Index('idx_point_date', ['date'])
@Index('idx_point_type', ['type'])
@Index('idx_point_transaction', ['transaction_id'])
export class PointHistory extends BaseEntity {
  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: RedemptionType,
    nullable: false,
  })
  type!: RedemptionType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  month?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  year?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiry?: Date | null;

  @Column({
    type: 'enum',
    enum: PointStatusEnum,
    nullable: false,
  })
  status!: PointStatusEnum;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  date!: Date;

  @Column({ type: 'int', default: 0 })
  user_remaining_points!: number;

  @Column({ type: 'int', default: 0 })
  taxable_points!: number;

  @Column({ type: 'int', default: 0 })
  tds_points!: number;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  transaction_id?: string | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expires_at?: Date;

  @Column({ name: 'remaining_points', type: 'int', default: 0 })
  remaining_points: number;

  @ManyToOne(() => User, (user) => user.pointHistories, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Order, (order) => order.pointHistory, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @OneToOne(() => Payout, (payout) => payout.pointHistory, { nullable: true })
  @JoinColumn({ name: 'payout_id' })
  payout?: Payout | null;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.pointHistories, { nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceEntity | null;
}
