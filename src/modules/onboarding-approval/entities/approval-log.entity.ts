import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities';
import { RetailerApproval } from './retailer-approval.entity';
import { ApprovalActorRole, ApprovalAction } from '../enums/approval-status.enum';

@Entity('approval_logs')
@Index(['retailer_approval_id'])
export class ApprovalLog extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint' })
  retailer_approval_id!: string;

  @ManyToOne(() => RetailerApproval)
  @JoinColumn({ name: 'retailer_approval_id' })
  retailer_approval!: RetailerApproval;

  // nullable -> SYSTEM-originated actions (e.g. SUBMITTED) have no human actor
  @Column({ type: 'bigint', nullable: true })
  actor_id?: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_id' })
  actor?: User;

  @Column({
    type: 'enum',
    enum: ApprovalActorRole,
  })
  actor_role!: ApprovalActorRole;

  @Column({
    type: 'enum',
    enum: ApprovalAction,
  })
  action!: ApprovalAction;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'json', nullable: true })
  rework_fields?: string[] | null;

  // geo, image urls, otp ref, or any other contextual payload
  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  // append-only: intentionally no updated_at
  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;
}