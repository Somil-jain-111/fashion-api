import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';
import { SellerReviewSection } from './seller-review.entity';

export enum SellerUpdateRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('seller_update_requests')
@Index(['sellerId', 'status'])
export class SellerUpdateRequest extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' }) sellerId!: number;
  @Column({ type: 'enum', enum: SellerReviewSection }) section!: SellerReviewSection;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @Column({
    type: 'enum',
    enum: SellerUpdateRequestStatus,
    default: SellerUpdateRequestStatus.PENDING,
  })
  status!: SellerUpdateRequestStatus;
}
