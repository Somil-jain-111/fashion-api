import { BaseEntity } from 'src/default/common/entities';
import { Approval, User } from 'src/modules/auth/entities';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';


export enum SoRejectionReason {
  OUTLET_PERMANENTLY_CLOSED = 'outlet_permanently_closed',
  RETAILER_NOT_AVAILABLE = 'retailer_not_available',
  WRONG_SHOP_ADDRESS = 'wrong_shop_address',
  NOT_INTERESTED_IN_LOYALTY = 'not_interested_in_loyalty_programme',
  DUPLICATE_REGISTERED_OUTLET = 'duplicate_registered_outlet',
  OTHER = 'other',
}

export enum SoVerificationStatus {
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('so_verification_evidence')
export class SoVerificationEvidence extends BaseEntity {
  // The level-3 approval row this evidence belongs to
  @ManyToOne(() => Approval, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approval_id' })
  approval!: Approval;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'so_user_id' })
  soUser!: User;

  // The retailer whose outlet was visited
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_user_id' })
  retailerUser!: User;

  @Column({
    type: 'enum',
    enum: SoVerificationStatus,
    nullable: false,
  })
  status!: SoVerificationStatus;

  // ---- Evidence fields (verify flow) ----
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'so_selfie_url' })
  soSelfieUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'store_owner_image_url' })
  storeOwnerImageUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'outlet_image_url' })
  outletImageUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'geo_lat' })
  geoLat?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'geo_lng' })
  geoLng?: number;

  @Column({ type: 'datetime', nullable: true, name: 'geo_captured_at' })
  geoCapturedAt?: Date;

  // Stored for audit — how far the SO was from the store when they submitted
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'distance_from_store_meters' })
  distanceFromStoreMeters?: number;

  // ---- Rejection fields ----
  @Column({
    type: 'enum',
    enum: SoRejectionReason,
    nullable: true,
    name: 'rejection_reason',
  })
  rejectionReason?: SoRejectionReason;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'rejection_proof_image_url' })
  rejectionProofImageUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  remarks?: string;
}