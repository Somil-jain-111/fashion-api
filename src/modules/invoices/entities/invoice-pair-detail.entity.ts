// src/default/common/entities/invoice-pair-detail.entity.ts

import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceAssortmentEntity } from './invoice-assortment.entity';
import { InvoicePairScanStatus } from '../enum/invoice-pair-scan-status.enum';

@Entity({ name: 'invoice_pair_details' })
@Index('idx_invoice_pair_details_assortment_id', ['assortment_id'])
@Index('idx_invoice_pair_details_pair_uid', ['pair_uid'])
@Index('idx_invoice_pair_details_pair_qr', ['pair_qr'])
@Index('idx_invoice_pair_details_status', ['status'])
export class InvoicePairDetailEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  assortment_id: string;

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
  @Column({ type: 'bigint', unsigned: true, nullable: true })
  scanned_by: string;

  get scanned_by_user_id(): string {
    return this.scanned_by;
  }

  set scanned_by_user_id(val: string) {
    this.scanned_by = val;
  }

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

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @ManyToOne(() => InvoiceAssortmentEntity, (assortment) => assortment.pair_details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assortment_id' })
  assortment: InvoiceAssortmentEntity;
}
