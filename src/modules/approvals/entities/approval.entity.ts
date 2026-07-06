import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
//
import { User } from '../../auth/entities/index';
import { BaseEntity } from '../../../default/common/entities';
import { ApprovalStatus, ApprovalType } from '../../../default/common/enums/approvals.enum';

@Entity('approvals')
export class Approval extends BaseEntity {
  @ManyToOne(() => User, (user) => user.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: ApprovalType, nullable: false })
  approval_type!: ApprovalType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  status!: ApprovalStatus;

  @ManyToOne(() => User, (user) => user.approvals, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'approved_by' })
  approved_by!: User;

  @Column({ type: 'datetime', nullable: true })
  approved_at!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo?: User | null;

  @Column({ type: 'int', default: 1 })
  level!: number;
}
