import { BaseEntity } from '../../../default/common/entities';
import {
  Column,
  Entity,
  Index,

} from 'typeorm';

export enum PointPurchaseStatus {
  CREATING = 'CREATING',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

@Entity('point_purchases')
@Index('uq_point_purchase_reference', ['referenceId'], { unique: true })
@Index('uq_point_purchase_link', ['paymentLinkId'], { unique: true })
@Index('uq_point_purchase_payment', ['razorpayPaymentId'], { unique: true })
@Index('idx_point_purchase_user_status', ['userId', 'status'])
export class PointPurchase extends BaseEntity {
  @Column({ name: 'reference_id', type: 'varchar', length: 100, unique: true })
  referenceId: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'int', unsigned: true })
  points: number;

  @Column({ name: 'base_amount_paise', type: 'int', unsigned: true })
  baseAmountPaise: number;

  @Column({ name: 'platform_fee_paise', type: 'int', unsigned: true })
  platformFeePaise: number;

  @Column({ name: 'gst_amount_paise', type: 'int', unsigned: true })
  gstAmountPaise: number;

  @Column({ name: 'payable_amount_paise', type: 'int', unsigned: true })
  payableAmountPaise: number;

  @Column({ name: 'payment_link_id', type: 'varchar', length: 100, nullable: true, unique: true })
  paymentLinkId?: string;

  @Column({ name: 'payment_url', type: 'varchar', length: 500, nullable: true })
  paymentUrl?: string;

  @Column({
    name: 'razorpay_payment_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  razorpayPaymentId?: string;

  @Column({
    type: 'enum',
    enum: PointPurchaseStatus,
    default: PointPurchaseStatus.CREATING,
  })
  status: PointPurchaseStatus;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason?: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt?: Date;

  @Column({ name: 'provider_payload', type: 'json', nullable: true })
  providerPayload?: Record<string, unknown>;
}
