import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { AuditAction } from '../enum/audit-action.enum';

/**
 * Generic append-only change log — one row per create/update/delete on any admin-managed
 * resource. `changes` holds the full payload on CREATE, a { field: { from, to } } diff on
 * UPDATE, and a snapshot of the record at the moment of DELETE. Never edited or removed.
 */
@Entity({ name: 'audit_logs' })
@Index('idx_audit_logs_module_entity', ['module', 'entity_id'])
@Index('idx_audit_logs_performed_by', ['performed_by'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  module: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 50 })
  entity_id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'json', nullable: true })
  changes: Record<string, unknown> | null;

  @Column({ name: 'performed_by', type: 'bigint' })
  performed_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'performed_by' })
  performedByUser: User;
}
