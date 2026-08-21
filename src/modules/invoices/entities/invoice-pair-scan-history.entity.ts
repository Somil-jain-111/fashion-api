import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceScanHistory } from './invoice-scan-history.entity';
import { InvoicePairDetailEntity } from './invoice-pair-detail.entity';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity('invoice_pair_scan_histories')
@Index('idx_pair_uid', ['pair_uid'])
@Index('idx_scan_history', ['invoiceScanHistory'])
export class InvoicePairScanHistory extends BaseEntity {
  @ManyToOne(() => InvoiceScanHistory, (scan) => scan.pairScans)
  @JoinColumn({ name: 'invoice_scan_history_id' })
  invoiceScanHistory!: InvoiceScanHistory;

  @ManyToOne(() => InvoicePairDetailEntity)
  @JoinColumn({ name: 'invoice_pair_detail_id' })
  invoicePairDetail!: InvoicePairDetailEntity;

  @Column({ type: 'varchar', length: 100 })
  pair_uid!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pair_qr?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  points!: number;

  @Column({
    type: 'enum',
    enum: InvoicePairScanStatus,
  })
  status!: InvoicePairScanStatus;

  @CreateDateColumn()
  scanned_at!: Date;
}
