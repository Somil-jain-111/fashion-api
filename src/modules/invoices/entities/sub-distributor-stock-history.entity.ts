import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { InvoiceEntity } from './invoice.entity';
import { SubDistributorStockHistoryDetailEntity } from './sub-distributor-stock-history-detail.entity';

/**
 * Immutable audit log of every stock-crediting event — one row per SKU per submission
 * (matching SubDistributorStockSettlementService's per-SKU grouping). `sub_distributor_stock`
 * only holds the running total; this is the "how did it get there" trail, always tagged with
 * the invoice it came from.
 */
@Entity({ name: 'sub_distributor_stock_history' })
@Index('idx_sub_distributor_stock_history_sub_distributor_id', ['subDistributor'])
@Index('idx_sub_distributor_stock_history_invoice_id', ['invoice'])
export class SubDistributorStockHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sub_distributor_id' })
  subDistributor!: User;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice!: InvoiceEntity;

  @Column({ name: 'item_code', type: 'varchar', length: 150 })
  item_code!: string;

  @Column({ name: 'item_name', type: 'varchar', length: 255, nullable: true })
  item_name?: string;

  @Column({ name: 'quantity_added', type: 'int' })
  quantity_added!: number;

  /**
   * Snapshot of sub_distributor_stock.quantity immediately after this event was applied —
   * for debugging/auditing without having to replay every prior event.
   */
  @Column({ name: 'total_quantity_after', type: 'int' })
  total_quantity_after!: number;

  @Column({ name: 'submission_id', type: 'varchar', length: 100, nullable: true })
  submission_id?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @OneToMany(() => SubDistributorStockHistoryDetailEntity, (detail) => detail.history, {
    cascade: true,
  })
  details: SubDistributorStockHistoryDetailEntity[];
}
