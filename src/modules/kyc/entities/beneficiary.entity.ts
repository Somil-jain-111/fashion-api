import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
//
import { User } from '../../auth/entities';
import { BaseEntity } from '../../../default/common/entities';
import { BeneficiaryType } from '../../../default/common/enums/kyc.enum';

@Entity('user_beneficiaries')
@Index(['user'])
@Index(['type', 'active'])
export class UserBeneficiary extends BaseEntity {
  @ManyToOne(() => User, (user) => user.id, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: BeneficiaryType,
  })
  type!: BeneficiaryType;

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

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId?: string | null;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, any> | null;
}
