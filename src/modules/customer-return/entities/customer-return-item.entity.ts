import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from '../../invoices/entities/invoice-pair-detail.entity';
import { CustomerReturnIssueType } from '../enum/customer-return.enum';
import { CustomerReturnEntity } from './customer-return.entity';

@Entity({ name: 'customer_return_items' })
@Index('idx_customer_return_items_return_id', ['customerReturn'])
@Index('idx_customer_return_items_pair_uid', ['pair_uid'])
export class CustomerReturnItemEntity extends BaseEntity {
  @ManyToOne(() => CustomerReturnEntity, (cr) => cr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'return_id' })
  customerReturn: CustomerReturnEntity;

  @ManyToOne(() => InvoicePairDetailEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pair_id' })
  pair?: InvoicePairDetailEntity | null;

  @ManyToOne(() => InvoiceEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceEntity | null;

  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  @Column({
    type: 'enum',
    enum: CustomerReturnIssueType,
  })
  issue_type: CustomerReturnIssueType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @Column({ name: 'item_code', type: 'varchar', length: 150, nullable: true })
  item_code?: string | null;

  @Column({ name: 'sub_item_code', type: 'varchar', length: 150, nullable: true })
  sub_item_code?: string | null;
}
