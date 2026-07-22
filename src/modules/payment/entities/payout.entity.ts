import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
//
import { User, PointHistory, UserBeneficiary } from '../../auth/entities';
import { BaseEntity } from '../../../default/common/entities';

export enum PayoutStatus {
  INITIATED = 'INITIATED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'payouts' })
export class Payout extends BaseEntity {
  @Column({ type: 'varchar', length: 100, name: 'transaction_id', unique: true, nullable: false })
  transaction_id!: string;

  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.INITIATED,
  })
  status!: PayoutStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  otp?: string | null;

  @Column({ type: 'tinyint', default: 0 })
  otp_verified!: number;

  @Column({ type: 'datetime', nullable: true })
  otp_expiry?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'account_number' })
  account_number?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ifsc_code' })
  ifsc_code?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'bank_name' })
  bank_name?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'redeem_date' })
  redeem_date?: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => UserBeneficiary, { nullable: false })
  @JoinColumn({ name: 'beneficiary_id' })
  userBeneficiary!: UserBeneficiary;

  @OneToOne(() => PointHistory, (pointHistory) => pointHistory.payout, { nullable: true })
  pointHistory?: PointHistory | null;
}
