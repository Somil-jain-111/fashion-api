import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InvoiceEntity, InvoicePairScanHistory, User } from '../../auth/entities';
import { InvoiceScanStatus } from '../enum/invoice.enum';

@Entity('invoice_scan_histories')
@Index('idx_invoice_scan_user', ['user'])
@Index('idx_invoice_scan_invoice', ['invoice'])
@Index('idx_invoice_scan_status', ['status'])
export class InvoiceScanHistory extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => InvoiceEntity)
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceEntity;

  @Column({ type: 'varchar', length: 100 })
  invoice_no!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dealer_code?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  dealer_name?: string;

  @Column({ type: 'int', default: 0 })
  total_pairs!: number;

  @Column({ type: 'int', default: 0 })
  scanned_pairs!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_points!: number;

  @Column({
    type: 'enum',
    enum: InvoiceScanStatus,
    default: InvoiceScanStatus.IN_PROGRESS,
  })
  status!: InvoiceScanStatus;

  @Column({ type: 'datetime', nullable: true })
  started_at?: Date;

  @Column({ type: 'datetime', nullable: true })
  completed_at?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ip_address?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_id?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @OneToMany(() => InvoicePairScanHistory, (pair) => pair.invoiceScanHistory)
  pairScans!: InvoicePairScanHistory[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
