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
