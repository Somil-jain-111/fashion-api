import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { ScanAttemptType, ValidationOutcome } from '../enum/scan-attempt.enum';
import { ScanSource } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('invoice_scan_attempt_audit')
@Index('idx_attempt_audit_user_created', ['user', 'createdAt'])
@Index('idx_attempt_audit_invoice', ['invoiceNumber'])
@Index('idx_attempt_audit_session', ['sessionId'])
@Index('idx_attempt_audit_outcome', ['outcome'])
export class InvoiceScanAttemptAuditEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'app_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  appVersion?: string;

  @Column({
    name: 'endpoint',
    type: 'varchar',
    length: 150,
  })
  endpoint: string;

  @Column({
    name: 'http_method',
    type: 'varchar',
    length: 10,
  })
  httpMethod: string;

  @Column({
    name: 'attempt_type',
    type: 'enum',
    enum: ScanAttemptType,
  })
  attemptType: ScanAttemptType;

  @Column({
    name: 'scan_type',
    type: 'enum',
    enum: ScanSource,
    nullable: true,
  })
  scanType?: ScanSource;

  @Column({
    name: 'invoice_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  invoiceNumber?: string;

  @Column({
    name: 'session_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  sessionId?: string;

  @Column({
    name: 'pair_uids',
    type: 'json',
    nullable: true,
  })
  pairUids?: string[];

  @Column({
    name: 'outcome',
    type: 'enum',
    enum: ValidationOutcome,
  })
  outcome: ValidationOutcome;

  @Column({
    name: 'error_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  errorCode?: string;

  @Column({
    name: 'error_message',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  errorMessage?: string;

  @Column({
    name: 'metadata',
    type: 'json',
    nullable: true,
  })
  metadata?: Record<string, unknown>;
}
