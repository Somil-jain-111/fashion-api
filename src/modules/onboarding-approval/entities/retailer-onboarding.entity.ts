import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities';
import {
  OnboardingStep,
  BeneficiaryType,
  VerificationStatus,
} from '../enums/approval-status.enum';

@Entity('retailer_onboarding')
@Index(['user_id'])
export class RetailerOnboarding extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: OnboardingStep,
    nullable: true,
  })
  step_completed?: OnboardingStep | null;

  // ---- Basic details ----
  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name?: string;

  @Column({ type: 'date', nullable: true })
  dob?: Date;

  @Column({ type: 'varchar', length: 15, nullable: true })
  whatsapp_number?: string;

  // ---- PAN ----
  @Column({ type: 'varchar', length: 10, nullable: true })
  pan_number?: string;

  @Column({ type: 'datetime', nullable: true })
  pan_verified_at?: Date | null;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  pan_verification_status!: VerificationStatus;

  // ---- Aadhaar ----
  @Column({ type: 'varchar', length: 100, nullable: true })
  aadhaar_ref_id?: string; // never store raw aadhaar number

  @Column({ type: 'datetime', nullable: true })
  aadhaar_verified_at?: Date | null;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  aadhaar_verification_status!: VerificationStatus;

  // ---- GST (mandatory only if beneficiary_type = ENTITY) ----
  @Column({
    type: 'enum',
    enum: BeneficiaryType,
    nullable: true,
  })
  beneficiary_type?: BeneficiaryType;

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin?: string;

  @Column({ type: 'datetime', nullable: true })
  gst_verified_at?: Date | null;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    nullable: true,
  })
  gst_verification_status?: VerificationStatus;

  // ---- Store info ----
  @Column({ type: 'varchar', length: 150, nullable: true })
  store_name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  store_address?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  store_pincode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  store_city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  store_state?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  store_front_photo_url?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  store_display_photo_url?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  geo_lat?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  geo_lng?: string;

  @Column({ type: 'datetime', nullable: true })
  geo_captured_at?: Date | null;

  // set when STORE step completes -> triggers L1 queue entry
  @Column({ type: 'datetime', nullable: true })
  submitted_at?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}