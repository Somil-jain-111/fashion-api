import { Column, Entity, Index } from 'typeorm';
import { InvoiceHistoryStatus } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('invoice_scan_history')
@Index('idx_invoice_history_user_created', ['userId', 'createdAt'])
@Index('idx_invoice_history_invoice_status', ['invoiceId', 'status'])
@Index('idx_invoice_history_session', ['sessionId'])
export class InvoiceScanAuditEntity extends BaseEntity {
  @Column({ name: 'invoice_id', type: 'bigint', unsigned: true })
  invoiceId: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber: string;

  @Column({ name: 'session_id', type: 'char', length: 36 })
  sessionId: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'enum', enum: InvoiceHistoryStatus })
  status: InvoiceHistoryStatus;

  @Column({ name: 'points_awarded', type: 'int', unsigned: true, default: 0 })
  pointsAwarded: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;
}
