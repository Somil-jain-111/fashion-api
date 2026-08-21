import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from '../../invoices/entities/invoice-pair-detail.entity';
import { User } from '../../auth/entities/users.entity';

@Entity({ name: 'invoice_pair_returns' })
@Index('uq_invoice_pair_return_pair_id', ['pair_id'], { unique: true })
@Index('idx_invoice_pair_returns_invoice_id', ['invoice_id'])
@Index('idx_invoice_pair_returns_retailer_id', ['retailer_id'])
@Index('idx_invoice_pair_returns_distributor_id', ['distributor_id'])
export class InvoicePairReturnEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  invoice_id: string;

  /**
   * FK to the physical pair (invoice_pair_details.id) being returned — the true anti-replay
   * guard (unique below). pair_uid is kept alongside as a denormalized copy for display/audit
   * without needing to join back to invoice_pair_details.
   */
  @Column({ type: 'bigint', unsigned: true })
  pair_id: string;

  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  @Column({ type: 'bigint' })
  retailer_id: string;

  @Column({ type: 'bigint' })
  distributor_id: string;

  @Column({ name: 'points_refunded', type: 'int', default: 0 })
  points_refunded: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @ManyToOne(() => InvoicePairDetailEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pair_id' })
  pair: InvoicePairDetailEntity;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'distributor_id' })
  distributor: User;
}
