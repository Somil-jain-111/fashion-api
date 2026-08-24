import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoicePairDetailEntity } from './invoice-pair-detail.entity';
import { SubDistributorStockHistoryEntity } from './sub-distributor-stock-history.entity';

/**
 * One row per physical pair that contributed to a stock-history event — same parent/child
 * shape as distributor_returns/distributor_return_details, giving full traceability from a
 * stock-ledger increment down to the exact scanned pairs (and, via the pair, its invoice).
 */
@Entity({ name: 'sub_distributor_stock_history_details' })
@Index('uq_sub_distributor_stock_history_detail_pair_id', ['pair'], { unique: true })
@Index('idx_sub_distributor_stock_history_details_history_id', ['history'])
export class SubDistributorStockHistoryDetailEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => SubDistributorStockHistoryEntity, (history) => history.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'history_id' })
  history: SubDistributorStockHistoryEntity;

  @ManyToOne(() => InvoicePairDetailEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pair_id' })
  pair: InvoicePairDetailEntity;
}
