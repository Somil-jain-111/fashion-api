import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ScanExceptionStatus,
  ScanExceptionType,
} from '../enum/exception.enum';

@Entity('invoice_scan_exceptions')
@Index(
  'idx_scan_exceptions_invoice',
  ['invoiceId'],
)
@Index(
  'idx_scan_exceptions_status',
  ['status'],
)
@Index(
  'idx_scan_exceptions_session',
  ['sessionId'],
)
export class InvoiceScanExceptionEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'invoice_id',
    type: 'bigint',
    unsigned: true,
  })
  invoiceId: string;

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

  @Column({
    name: 'reviewed_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  reviewedBy?: string;

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

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}