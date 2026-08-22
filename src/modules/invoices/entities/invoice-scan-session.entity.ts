import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { User } from '../../auth/entities/users.entity';
import { InvoiceType, ScanSessionStatus } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('invoice_scan_sessions')
@Index('uq_invoice_scan_session_id', ['sessionId'], { unique: true })
@Index('uq_active_invoice_user', ['invoice', 'user', 'status'])
@Index('idx_session_user_status', ['user', 'status'])
@Index('idx_session_last_scanned', ['lastScannedAt'])
export class InvoiceScanSessionEntity extends BaseEntity {
  @Column({ name: 'session_id', type: 'char', length: 36, unique: true })
  sessionId: string;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100 })
  invoiceNumber: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'invoice_type', type: 'enum', enum: InvoiceType })
  invoiceType: InvoiceType;

  @Column({ name: 'expected_pairs', type: 'int', unsigned: true })
  expectedPairs: number;

  @Column({ name: 'scanned_pairs', type: 'int', unsigned: true, default: 0 })
  scannedPairs: number;

  @Column({ name: 'valid_pairs', type: 'int', unsigned: true, default: 0 })
  validPairs: number;

  @Column({ name: 'invalid_pairs', type: 'int', unsigned: true, default: 0 })
  invalidPairs: number;

  @Column({ type: 'enum', enum: ScanSessionStatus, default: ScanSessionStatus.ACTIVE })
  status: ScanSessionStatus;

  @Column({ name: 'started_at', type: 'datetime' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ name: 'last_scanned_at', type: 'datetime', nullable: true })
  lastScannedAt?: Date;
}
