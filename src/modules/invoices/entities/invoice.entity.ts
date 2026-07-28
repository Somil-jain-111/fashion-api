// src/default/common/entities/invoice.entity.ts

import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, InvoiceItemEntity, InvoiceAssortmentEntity } from '../../auth/entities';
import { InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { InvoiceType } from '../enum/invoice-scan-session.enum';

@Entity({ name: 'invoices' })
@Index('uq_invoice_no_master_id', ['invoice_no', 'master_id'], { unique: true })
@Index('idx_invoice_user_id', ['user'])
@Index('idx_invoice_party_code', ['party_code'])
@Index('idx_invoice_master_id', ['master_id'])
@Index('idx_invoice_date', ['invoice_date'])
@Index('idx_invoice_status', ['status'])
@Index('idx_invoice_scan_status', ['scan_status'])
export class InvoiceEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @ManyToOne(() => User, (user) => user.invoices, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'invoice_no', type: 'varchar', length: 100 })
  invoice_no: string;

  @Column({ name: 'invoice_date', type: 'datetime' })
  invoice_date: Date;

  @Column({ name: 'party_code', type: 'varchar', length: 100 })
  party_code: string;

  @Column({ name: 'party_name', type: 'varchar', length: 255 })
  party_name: string;

  @Column({ name: 'master_id', type: 'varchar', length: 100 })
  master_id: string;

  @Column({
    name: 'gross_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  gross_amount: string;

  /**
   * Total points user can earn from this invoice
   */
  @Column({ type: 'int', default: 0 })
  allocated_points: number;

  /**
   * Points already credited/earned after QR scan
   */
  @Column({ type: 'int', default: 0 })
  earned_points: number;

  /**
   * Total pair QR count from invoice_pair_details
   */
  @Column({ type: 'int', default: 0 })
  total_pairs: number;

  @Column({ type: 'enum', enum: InvoiceType, default: InvoiceType.MULTIPLE })
  invoice_type: InvoiceType;

  @Column({ type: 'datetime', nullable: true })
  expires_at?: Date;

  /**
   * Successfully scanned pair QR count
   */
  @Column({ type: 'int', default: 0 })
  scanned_pairs: number;

  @Column({
    type: 'enum',
    enum: InvoiceScanStatus,
    default: InvoiceScanStatus.NOT_SCANNED,
  })
  scan_status: InvoiceScanStatus;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  created_by: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  updated_by: string;

  @OneToMany(() => InvoiceItemEntity, (item) => item.invoice)
  items: InvoiceItemEntity[];

  @OneToMany(() => InvoiceAssortmentEntity, (assortment) => assortment.invoice)
  assortments: InvoiceAssortmentEntity[];
}
