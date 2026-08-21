import { BaseEntity } from '../../../default/common/entities';
import { Column, Entity, Index } from 'typeorm';

@Entity('retailer_scan_age_audit_log')
@Index('idx_scan_age_audit_retailer', ['retailerId', 'createdAt'])
export class RetailerScanAgeAuditEntity extends BaseEntity {
  @Column({
    name: 'retailer_id',
    type: 'bigint',
    unsigned: true,
  })
  retailerId: string;

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

  @Column({
    name: 'changed_by',
    type: 'bigint',
    unsigned: true,
  })
  changedBy: string;

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
