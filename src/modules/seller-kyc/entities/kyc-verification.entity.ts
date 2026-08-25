import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities';
import { BaseEntity } from '../../../default/common/entities';
import { KycStatus, KycType } from '../../../default/common/enums/kyc.enum';

@Entity('kyc_verifications')
@Index(['user'])
@Index(['type', 'status'])
export class KycVerificationEntity extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: KycType,
  })
  type: KycType;

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({ name: 'reference_id', nullable: true, unique: true })
  referenceId?: string;

  @Column({ name: 'document_number', nullable: true })
  documentNumber?: string;

  @Column({ name: 'masked_document_number', nullable: true })
  maskedDocumentNumber?: string;

  @Column({ name: 'verified_name', nullable: true })
  verifiedName?: string;

  @Column({ name: 'provider', nullable: true })
  provider?: string;

  @Column({ name: 'provider_request', type: 'json', nullable: true })
  providerRequest?: Record<string, any>;

  @Column({ name: 'provider_response', type: 'json', nullable: true })
  providerResponse?: Record<string, any>;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;
}
