import { Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities';

export enum SellerBusinessType {
  INDIVIDUAL = 'INDIVIDUAL',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  PARTNERSHIP = 'PARTNERSHIP',
  LLP = 'LLP',
  PRIVATE_LIMITED = 'PRIVATE_LIMITED',
  PUBLIC_LIMITED = 'PUBLIC_LIMITED',
}

export enum SellerOnboardingStatus {
  AGREEMENT_PENDING = 'AGREEMENT_PENDING',
  KYC_PENDING = 'KYC_PENDING',
  BANK_DETAILS_PENDING = 'BANK_DETAILS_PENDING',
  ESIGN_PENDING = 'ESIGN_PENDING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Owns seller onboarding state and the submitted business/bank/agreement snapshot.
 * Provider verification results remain isolated in kyc_verifications.
 */
@Entity('store_information')
@Unique('UQ_STORE_INFORMATION_SELLER', ['sellerId'])
export class StoreInformation extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' })
  sellerId!: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ type: 'varchar', length: 150, name: 'store_name' })
  storeName!: string;

  @Column({ type: 'enum', enum: SellerBusinessType, name: 'business_type', nullable: true })
  businessType?: SellerBusinessType;

  @Column({ type: 'text', name: 'pan_number', nullable: true })
  panNumber?: string;

  @Column({ type: 'text', name: 'gstin_number', nullable: true })
  gstinNumber?: string | null;

  @Column({ type: 'varchar', length: 255, name: 'street_address', nullable: true })
  streetAddress?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 6, nullable: true })
  pincode?: string;

  @Column({ type: 'varchar', length: 150, name: 'contact_name', nullable: true })
  contactName?: string;

  @Column({ type: 'varchar', length: 255, name: 'contact_email', nullable: true })
  contactEmail?: string;

  @Column({ type: 'varchar', length: 15, name: 'contact_phone', nullable: true })
  contactPhone?: string;

  @Column({ type: 'varchar', length: 50, name: 'agreement_version', nullable: true })
  agreementVersion?: string | null;

  @Column({ type: 'datetime', name: 'agreement_accepted_at', nullable: true })
  agreementAcceptedAt?: Date | null;

  @Column({ type: 'varchar', length: 64, name: 'agreement_ip', nullable: true })
  agreementIp?: string | null;

  @Column({ type: 'text', name: 'bank_account_holder_name', nullable: true })
  bankAccountHolderName?: string | null;

  @Column({ type: 'text', name: 'bank_account_number', nullable: true })
  bankAccountNumber?: string | null;

  @Column({ type: 'text', name: 'bank_ifsc_code', nullable: true })
  bankIfscCode?: string | null;

  @Column({ type: 'varchar', length: 150, name: 'bank_name', nullable: true })
  bankName?: string | null;

  @Column({ type: 'varchar', length: 150, name: 'bank_branch', nullable: true })
  bankBranch?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'bank_state', nullable: true })
  bankState?: string | null;

  @Column({ type: 'text', name: 'cancelled_cheque_url', nullable: true })
  cancelledChequeUrl?: string | null;

  @Column({ type: 'text', name: 'signature_url', nullable: true })
  signatureUrl?: string | null;

  @Column({ type: 'varchar', length: 100, name: 'esign_document_id', nullable: true })
  esignDocumentId?: string | null;

  @Column({ type: 'datetime', name: 'signed_at', nullable: true })
  signedAt?: Date | null;

  @Column({
    type: 'enum',
    enum: SellerOnboardingStatus,
    name: 'onboarding_status',
    default: SellerOnboardingStatus.AGREEMENT_PENDING,
  })
  onboardingStatus!: SellerOnboardingStatus;
}
