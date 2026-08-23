import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoicePairDetailEntity } from '../../invoices/entities/invoice-pair-detail.entity';
import { DistributorReturnEntity } from './distributor-return.entity';

/**
 * One row per physical pair being returned. `points_refunded` here is the nominal per-pair
 * share (invoice.allocated_points / invoice.total_pairs) — the parent return's
 * total_points_refunded is what actually got deducted from the retailer's wallet, which may
 * be clamped lower if their balance ran out.
 */
@Entity({ name: 'distributor_return_details' })
@Index('uq_distributor_return_detail_pair_id', ['pair'], { unique: true })
@Index('idx_distributor_return_details_return_id', ['return'])
export class DistributorReturnDetailEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'pair_uid', type: 'varchar', length: 100 })
  pair_uid: string;

  @Column({ name: 'points_refunded', type: 'int', default: 0 })
  points_refunded: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => DistributorReturnEntity, (returnEntity) => returnEntity.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'return_id' })
  return: DistributorReturnEntity;

  @ManyToOne(() => InvoicePairDetailEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pair_id' })
  pair: InvoicePairDetailEntity;
}
