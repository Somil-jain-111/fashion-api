import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { User } from '../../auth/entities/users.entity';
import { ScanExceptionStatus, ScanExceptionType } from '../enum/exception.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('invoice_scan_exceptions')
@Index('idx_scan_exceptions_invoice', ['invoice'])
@Index('idx_scan_exceptions_status', ['status'])
@Index('idx_scan_exceptions_session', ['sessionId'])
export class InvoiceScanExceptionEntity extends BaseEntity {
  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({
    name: 'session_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  sessionId?: string;

  @Column({
    name: 'pair_uid',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  pairUid?: string;

  @Column({
    name: 'item_code',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  itemCode?: string;

  @Column({
    name: 'exception_type',
    type: 'enum',
    enum: ScanExceptionType,
  })
  exceptionType: ScanExceptionType;

  @Column({
    name: 'raw_payload',
    type: 'json',
    nullable: true,
  })
  rawPayload?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: ScanExceptionStatus,
    default: ScanExceptionStatus.PENDING,
  })
  status: ScanExceptionStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  @Column({
    name: 'reviewed_at',
    type: 'timestamp',
    nullable: true,
  })
  reviewedAt?: Date;

  @Column({
    name: 'resolution_notes',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  resolutionNotes?: string;
}
