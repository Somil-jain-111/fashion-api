import { Column, Entity, Index } from 'typeorm';
import { PairHistoryStatus, ScanSource } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('pair_scan_history')
@Index('uq_pair_invoice', ['invoiceId', 'pairUid'], { unique: true })
@Index('uq_pair_session', ['sessionId', 'pairUid'], { unique: true })
@Index('idx_pair_history_user_created', ['userId', 'createdAt'])
export class PairScanHistoryEntity extends BaseEntity {
  @Column({ name: 'session_id', type: 'char', length: 36 })
  sessionId: string;

  @Column({ name: 'invoice_id', type: 'bigint', unsigned: true })
  invoiceId: string;

  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pairUid: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'enum', enum: PairHistoryStatus })
  status: PairHistoryStatus;

  @Column({ name: 'scan_source', type: 'enum', enum: ScanSource })
  scanSource: ScanSource;

  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
  failureReason?: string;
}
