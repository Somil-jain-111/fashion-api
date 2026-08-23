import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceAssortmentEntity } from './invoice-assortment.entity';
import { User } from '../../auth/entities/users.entity';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';
import { BaseEntity } from '../../../default/common/entities';
import { InvoiceEntity } from './invoice.entity';

@Entity({ name: 'invoice_pair_details' })
@Index('idx_invoice_pair_details_assortment_id', ['assortment'])
@Index('idx_invoice_pair_details_pair_uid', ['pair_uid'])
@Index('idx_invoice_pair_details_pair_qr', ['pair_qr'])
@Index('idx_invoice_pair_details_status', ['status'])
export class InvoicePairDetailEntity extends BaseEntity {
  /**
   * pairdetail.pairqr
   */
  @Column({ name: 'pair_qr', type: 'varchar', length: 255 })
  pair_qr: string;

  /**
   * pairdetail.pairuid
   */
  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  /**
   * Sub item code from packing info
   */
  @Column({ name: 'sub_item_code', type: 'varchar', length: 150, nullable: true })
  sub_item_code: string;

  /**
   * Session ID for active scanning session
   */
  @Column({ name: 'session_id', type: 'varchar', length: 100, nullable: true })
  session_id: string;

  /**
   * Scan status
   */
  @Column({
    type: 'enum',
    enum: InvoicePairScanStatus,
    default: InvoicePairScanStatus.UNSCANNED,
  })
  status: InvoicePairScanStatus;

  /**
   * Which user scanned this QR
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'scanned_by' })
  scannedByUser?: User;

  get is_scanned(): boolean {
    return (
      this.status === InvoicePairScanStatus.SCANNED ||
      this.status === InvoicePairScanStatus.REDEEMED ||
      this.status === InvoicePairScanStatus.USED
    );
  }

  set is_scanned(val: boolean) {
    this.status = val ? InvoicePairScanStatus.SCANNED : InvoicePairScanStatus.UNSCANNED;
  }

  @Column({ type: 'timestamp', nullable: true })
  scanned_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  scan_remarks: string;

  @ManyToOne(() => InvoiceAssortmentEntity, (assortment) => assortment.pair_details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assortment_id' })
  assortment: InvoiceAssortmentEntity;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.assortments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;
}
