// src/default/common/entities/invoice-assortment.entity.ts

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { InvoiceEntity, InvoiceItemEntity, InvoicePairDetailEntity } from '../../auth/entities';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'invoice_assortments' })
@Index('idx_invoice_assortments_invoice_id', ['invoice_id'])
@Index('idx_invoice_assortments_item_id', ['item_id'])
@Index('idx_invoice_assortments_parent_item_code', ['parent_item_code'])
@Index('idx_invoice_assortments_packing_item_code', ['packing_item_code'])
@Index('idx_invoice_assortments_uid', ['uid'])
export class InvoiceAssortmentEntity extends BaseEntity {
  @Column({ type: 'bigint', unsigned: true })
  invoice_id: string;

  /**
   * FK to invoice_items.id — the parent line item this assortment (carton) belongs to.
   * Resolved at ingestion time by matching parent_item_code to invoice_items.item_code
   * within the same invoice.
   */
  @Column({ type: 'bigint', unsigned: true })
  item_id: string;

  /**
   * assortmentdetail.itemcode
   */
  @Column({ name: 'parent_item_code', type: 'varchar', length: 150 })
  parent_item_code: string;

  get item_code(): string {
    return this.parent_item_code;
  }

  set item_code(val: string) {
    this.parent_item_code = val;
  }

  /**
   * assortmentdetail.uid
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  uid: string;

  /**
   * packingInfo.itemcode
   */
  @Column({ name: 'packing_item_code', type: 'varchar', length: 150 })
  packing_item_code: string;

  /**
   * packingInfo.quantity
   */
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  quantity: string;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.assortments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @ManyToOne(() => InvoiceItemEntity, (item) => item.assortments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_id' })
  item: InvoiceItemEntity;

  @OneToMany(() => InvoicePairDetailEntity, (pair) => pair.assortment)
  pair_details: InvoicePairDetailEntity[];
}
