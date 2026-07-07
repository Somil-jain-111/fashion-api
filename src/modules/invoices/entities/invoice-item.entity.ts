// src/default/common/entities/invoice-item.entity.ts

import {
    BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceEntity } from './invoice.entity';

@Entity({ name: 'invoice_items' })
@Index('idx_invoice_items_invoice_id', ['invoice_id'])
@Index('idx_invoice_items_item_code', ['item_code'])
export class InvoiceItemEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  invoice_id: string;

  @Column({ name: 'item_code', type: 'varchar', length: 150 })
  item_code: string;

  @Column({ name: 'item_name', type: 'varchar', length: 255 })
  item_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  quantity: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  rate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  mrp: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cess: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  igst: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_amount: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @ManyToOne(() => InvoiceEntity, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;
}