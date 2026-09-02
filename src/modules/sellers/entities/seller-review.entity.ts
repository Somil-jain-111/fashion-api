import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';
import { SellerOnboardingStatus } from './store-information.entity';

export enum SellerReviewSection {
  PROFILE = 'PROFILE',
  PAN = 'PAN',
  AADHAAR = 'AADHAAR',
  GST = 'GST',
  BANK_DETAILS = 'BANK_DETAILS',
  ESIGN = 'ESIGN',
}

export enum SellerReviewIssueStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

@Entity('seller_review_issues')
@Index(['sellerId', 'status'])
export class SellerReviewIssue extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' }) sellerId!: number;
  @Column({ type: 'enum', enum: SellerReviewSection }) section!: SellerReviewSection;
  @Column({ type: 'text' }) remark!: string;
  @Column({ type: 'enum', enum: SellerReviewIssueStatus, default: SellerReviewIssueStatus.OPEN })
  status!: SellerReviewIssueStatus;
  @Column({ type: 'int', name: 'review_cycle' }) reviewCycle!: number;
  @Column({ type: 'bigint', name: 'reviewed_by' }) reviewedBy!: number;
  @Column({ type: 'datetime', name: 'resolved_at', nullable: true }) resolvedAt?: Date | null;
}

@Entity('seller_onboarding_audits')
@Index(['sellerId', 'createdAt'])
export class SellerOnboardingAudit extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' }) sellerId!: number;
  @Column({ type: 'bigint', name: 'actor_id' }) actorId!: number;
  @Column({ type: 'varchar', length: 50, name: 'actor_role' }) actorRole!: string;
  @Column({ type: 'varchar', length: 100 }) action!: string;
  @Column({ type: 'enum', enum: SellerReviewSection, nullable: true })
  section?: SellerReviewSection | null;
  @Column({ type: 'enum', enum: SellerOnboardingStatus, name: 'from_status', nullable: true })
  fromStatus?: SellerOnboardingStatus | null;
  @Column({ type: 'enum', enum: SellerOnboardingStatus, name: 'to_status', nullable: true })
  toStatus?: SellerOnboardingStatus | null;
  @Column({ type: 'json', nullable: true }) metadata?: Record<string, unknown> | null;
}
