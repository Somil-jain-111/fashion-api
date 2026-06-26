import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Order, User } from '../../auth/entities';
import { RedemptionType } from '../enum/redemption-type.enum';
import { PointStatusEnum } from '../enum/point-history-status.enum.';

@Entity({ name: 'point_histories' })
@Index('idx_point_user', ['user'])
@Index('idx_point_status', ['status'])
@Index('idx_point_date', ['date'])
@Index('idx_point_type', ['type'])
@Index('idx_point_transaction', ['transaction_id'])
export class PointHistory extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

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

  @Column({ type: 'bigint' })
  user_id!: string;

  @Column({ type: 'bigint' })
  order_id!: string;
  
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

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
