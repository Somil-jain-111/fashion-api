import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  BaseEntity,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/index';
import { ApprovalStatus, ApprovalType } from '../../../default/common/enums/approvals.enum';

@Entity('approvals')
export class Approval extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => User, (user) => user.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: ApprovalType, nullable: false })
  approval_type!: ApprovalType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  status!: ApprovalStatus;

  @ManyToOne(() => User, (user) => user.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'approved_by' })
  approved_by: User;

  @Column({ type: 'datetime', nullable: true })
  approved_at: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at: Date;
}
