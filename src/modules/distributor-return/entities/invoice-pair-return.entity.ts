import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from '../../invoices/entities/invoice-pair-detail.entity';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'invoice_pair_returns' })
@Index('uq_invoice_pair_return_pair_id', ['pair'], { unique: true })
@Index('idx_invoice_pair_returns_invoice_id', ['invoice'])
@Index('idx_invoice_pair_returns_retailer_id', ['retailer'])
@Index('idx_invoice_pair_returns_distributor_id', ['distributor'])
export class InvoicePairReturnEntity extends BaseEntity {
  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  @Column({ name: 'points_refunded', type: 'int', default: 0 })
  points_refunded: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

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
