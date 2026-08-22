import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceEntity } from './invoice.entity';
import { User } from '../../auth/entities/users.entity';
import { PairHistoryStatus, ScanSource } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('pair_scan_history')
@Index('uq_pair_invoice', ['invoice', 'pairUid'], { unique: true })
@Index('uq_pair_session', ['sessionId', 'pairUid'], { unique: true })
@Index('idx_pair_history_user_created', ['user', 'createdAt'])
export class PairScanHistoryEntity extends BaseEntity {
  @Column({ name: 'session_id', type: 'char', length: 36 })
  sessionId: string;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pairUid: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: PairHistoryStatus })
  status: PairHistoryStatus;

  @Column({ name: 'scan_source', type: 'enum', enum: ScanSource })
  scanSource: ScanSource;

  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
  failureReason?: string;
}
