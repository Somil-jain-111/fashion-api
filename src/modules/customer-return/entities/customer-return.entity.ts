import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities/users.entity';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';
import { InvoicePairDetailEntity } from '../../invoices/entities/invoice-pair-detail.entity';
import { InvoiceItemEntity } from '../../../modules/auth/entities';
import { CustomerReturnAttachmentEntity } from './customer-return-attachment.entity';

@Entity({ name: 'customer_returns' })
@Index('idx_customer_returns_pair_uid', ['pair_uid'])
@Index('idx_customer_returns_retailer_id', ['retailer'])
@Index('idx_customer_returns_invoice_id', ['invoice'])
export class CustomerReturnEntity extends BaseEntity {
  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer: User;

  @ManyToOne(() => InvoiceEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: InvoiceEntity | null;

  @ManyToOne(() => InvoiceItemEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoice_item_id' })
  invoiceItem?: InvoiceItemEntity | null;

  @ManyToOne(() => InvoicePairDetailEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pair_id' })
  pair?: InvoicePairDetailEntity | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @OneToMany(() => CustomerReturnAttachmentEntity, (attachment) => attachment.customerReturn, {
    cascade: true,
  })
  attachments?: CustomerReturnAttachmentEntity[];
}
