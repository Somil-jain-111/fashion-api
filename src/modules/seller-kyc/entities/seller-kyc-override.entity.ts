import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { SellerKycStatus } from '../../../default/common/enums/kyc.enum';
import { User } from '../../auth/entities';

@Entity('seller_kyc_overrides')
@Unique('UQ_SELLER_KYC_OVERRIDE_SELLER', ['sellerId'])
export class SellerKycOverride extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' })
  sellerId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ type: 'enum', enum: SellerKycStatus })
  status!: SellerKycStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'bigint', name: 'reviewed_by' })
  reviewedBy!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer!: User;

  @Column({ type: 'datetime', name: 'reviewed_at' })
  reviewedAt!: Date;
}
