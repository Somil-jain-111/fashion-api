import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity('retailer_scan_age_audit_log')
@Index('idx_scan_age_audit_retailer', ['retailer', 'createdAt'])
export class RetailerScanAgeAuditEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer: User;

  @Column({
    name: 'old_value',
    type: 'int',
    unsigned: true,
  })
  oldValue: number;

  @Column({
    name: 'new_value',
    type: 'int',
    unsigned: true,
  })
  newValue: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;

  @Column({
    type: 'varchar',
    length: 500,
  })
  reason: string;

  @Column({
    name: 'approval_reference',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  approvalReference?: string;
}
