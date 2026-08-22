import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { User } from '../../auth/entities/users.entity';
import { InvoiceHistoryStatus } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('invoice_scan_history')
@Index('idx_invoice_history_user_created', ['user', 'createdAt'])
@Index('idx_invoice_history_invoice_status', ['invoice', 'status'])
@Index('idx_invoice_history_session', ['sessionId'])
export class InvoiceScanAuditEntity extends BaseEntity {
  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber: string;

  @Column({ name: 'session_id', type: 'char', length: 36 })
  sessionId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: InvoiceHistoryStatus })
  status: InvoiceHistoryStatus;

  @Column({ name: 'points_awarded', type: 'int', unsigned: true, default: 0 })
  pointsAwarded: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;
}
