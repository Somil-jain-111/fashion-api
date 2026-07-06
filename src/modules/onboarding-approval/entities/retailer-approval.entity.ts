import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities';
import { RetailerOnboarding } from './retailer-onboarding.entity';
import { ApprovalStatus, ApprovalLevel } from '../enums/approval-status.enum';

@Entity('retailer_approvals')
@Index(['status'])
@Index(['l1_user_id'])
@Index(['l2_user_id'])
export class RetailerApproval extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', unique: true })
  user_id!: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'bigint' })
  onboarding_id!: string;

  @OneToOne(() => RetailerOnboarding)
  @JoinColumn({ name: 'onboarding_id' })
  onboarding!: RetailerOnboarding;

  // Assigned at submission time via getApprover(role). Fixed FK per record;
  // does not change automatically if hierarchy mapping changes later.
  @Column({ type: 'bigint', nullable: true })
  l1_user_id?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'l1_user_id' })
  l1_approver?: User;

  @Column({ type: 'bigint', nullable: true })
  l2_user_id?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'l2_user_id' })
  l2_approver?: User;

  @Column({
    type: 'enum',
    enum: ApprovalLevel,
    default: ApprovalLevel.L1,
  })
  current_level!: ApprovalLevel;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING_L1,
  })
  status!: ApprovalStatus;

  @Column({ type: 'json', nullable: true })
  rework_fields?: string[] | null;

  @Column({ type: 'text', nullable: true })
  rework_comment?: string | null;

  @Column({ type: 'text', nullable: true })
  rejection_comment?: string | null;

  // set on APPROVED -> starts 30-day redemption window tracking on User
  @Column({ type: 'datetime', nullable: true })
  activated_at?: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}