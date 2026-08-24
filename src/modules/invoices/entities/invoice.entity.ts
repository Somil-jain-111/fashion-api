import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { InvoiceItemEntity } from './invoice-item.entity';
import { InvoiceAssortmentEntity } from './invoice-assortment.entity';
import { InvoiceOwnerType, InvoiceScanStatus, InvoiceStatus } from '../enum/invoice.enum';
import { InvoiceType } from '../enum/invoice-scan-session.enum';
import { BaseEntity } from '../../../default/common/entities';
import { InvoicePairDetailEntity, PointHistory } from '../../../modules/auth/entities';

@Entity({ name: 'invoices' })
@Index('uq_invoice_no_master_id', ['invoice_no', 'master_id'], { unique: true })
@Index('idx_invoice_user_id', ['user'])
@Index('idx_invoice_party_code', ['party_code'])
@Index('idx_invoice_master_id', ['master_id'])
@Index('idx_invoice_date', ['invoice_date'])
@Index('idx_invoice_status', ['status'])
@Index('idx_invoice_scan_status', ['scan_status'])
@Index('idx_invoice_distributor_id', ['distributor'])
export class InvoiceEntity extends BaseEntity {
  @ManyToOne(() => User, (user) => user.invoices, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * The distributor this invoice was issued by. Used by the retailer-invoice validate
   * flow to confirm the invoice actually belongs to a distributor the retailer is
   * mapped to (via UserMapping), independent of whichever user_id it was ingested under.
   */
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'distributor_id' })
  distributor?: User;

  @Column({ name: 'invoice_no', type: 'varchar', length: 100 })
  invoice_no!: string;

  @Column({ name: 'invoice_date', type: 'datetime' })
  invoice_date!: Date;

  @Column({ name: 'party_code', type: 'varchar', length: 100 })
  party_code!: string;

  @Column({ name: 'party_name', type: 'varchar', length: 255 })
  party_name!: string;

  @Column({ name: 'master_id', type: 'varchar', length: 100 })
  master_id!: string;

  @Column({
    name: 'gross_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  gross_amount!: string;

  /**
   * Total points user can earn from this invoice
   */
  @Column({ type: 'int', default: 0 })
  allocated_points!: number;

  /**
   * Points already credited/earned after QR scan
   */
  @Column({ type: 'int', default: 0 })
  earned_points!: number;

  /**
   * Total pair QR count from invoice_pair_details
   */
  @Column({ type: 'int', default: 0 })
  total_pairs: number;

  @Column({ type: 'enum', enum: InvoiceType, default: InvoiceType.MULTIPLE })
  invoice_type!: InvoiceType;

  @Column({ type: 'datetime', nullable: true })
  expires_at?: Date;

  /**
   * Successfully scanned pair QR count
   */
  @Column({ type: 'int', default: 0 })
  scanned_pairs!: number;

  @Column({
    type: 'enum',
    enum: InvoiceScanStatus,
    default: InvoiceScanStatus.NOT_SCANNED,
  })
  scan_status!: InvoiceScanStatus;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status!: InvoiceStatus;

  /**
   * Which flow claimed this invoice — RETAILER (earns points) or SUB_DISTRIBUTOR (adds to
   * their stock ledger). Null until claimed via validate().
   */
  @Column({ name: 'user_type', type: 'enum', enum: InvoiceOwnerType, nullable: true })
  user_type?: InvoiceOwnerType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks!: string;

  @Column({ name: 'submission_id', type: 'varchar', length: 100, nullable: true })
  submission_id?: string;

  @OneToMany(() => InvoiceItemEntity, (item) => item.invoice)
  items!: InvoiceItemEntity[];

  @OneToMany(() => InvoiceAssortmentEntity, (assortment) => assortment.invoice)
  assortments!: InvoiceAssortmentEntity[];

  @OneToMany(() => InvoicePairDetailEntity, (pair) => pair.invoice)
  pairDetails!: InvoicePairDetailEntity[];

  @OneToMany(() => PointHistory, (pointHistory) => pointHistory.invoice)
  pointHistories!: PointHistory[];
}
