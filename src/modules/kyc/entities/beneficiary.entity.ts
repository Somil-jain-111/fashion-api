import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
//
import { User } from '../../auth/entities';
import { BaseEntity } from '../../../default/common/entities';
import {
  BeneficiaryType,
  BeneficiaryStatus,
} from '../../../default/common/enums/user-beneficiary.enum';

@Entity('user_beneficiaries')
@Index(['user'])
@Index(['type', 'status'])
export class UserBeneficiary extends BaseEntity {
  @ManyToOne(() => User, (user) => user.id, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: BeneficiaryType,
  })
  type!: BeneficiaryType;

  @Column({
    type: 'enum',
    enum: BeneficiaryStatus,
    default: BeneficiaryStatus.PENDING,
  })
  status!: BeneficiaryStatus;

  @Column({ name: 'account_number', type: 'varchar', length: 255, nullable: true })
  accountNumber?: string | null;

  @Column({ name: 'ifsc', type: 'varchar', length: 255, nullable: true })
  ifsc?: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 255, nullable: true })
  bankName?: string | null;

  @Column({ name: 'bank_holder_name', type: 'varchar', length: 255, nullable: true })
  bankHolderName?: string | null;

  @Column({ name: 'upi', type: 'varchar', length: 255, nullable: true })
  upi?: string | null;

  @Column({ name: 'relationship', type: 'varchar', length: 255, nullable: true })
  relationship?: string | null;

  @Column({ name: 'beneficiary_name', type: 'varchar', length: 255, nullable: true })
  beneficiary_name?: string | null;

  @Column({ name: 'mobile_number', type: 'varchar', length: 255, nullable: true })
  mobileNumber?: string | null;

  @Column({ name: 'pan_number', type: 'varchar', length: 255, nullable: true })
  panNumber?: string | null;

  @Column({ name: 'aadhaar_number', type: 'varchar', length: 255, nullable: true })
  aadhaarNumber?: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId?: string | null;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  otp?: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'expiry_at' })
  otp_expiry?: Date | null;

  @Column({ type: 'bigint', default: 0, name: 'otp_attempt_count' })
  otp_attempt_count!: number;
}
