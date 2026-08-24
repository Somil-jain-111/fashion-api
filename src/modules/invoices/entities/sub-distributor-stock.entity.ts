import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';

/**
 * Running per-SKU stock ledger for a sub-distributor — credited by
 * SubDistributorStockSettlementService whenever they submit a scan session, instead of
 * earning reward points the way a retailer does. One row per (sub_distributor, item_code);
 * a re-scan of the same SKU on a later invoice increments the existing row rather than
 * creating a duplicate.
 */
@Entity({ name: 'sub_distributor_stock' })
@Index('uq_sub_distributor_stock_item', ['subDistributor', 'item_code'], { unique: true })
export class SubDistributorStockEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sub_distributor_id' })
  subDistributor!: User;

  /**
   * assortment.packing_item_code — the exact size/box SKU, e.g. "NS3107-04-L5".
   */
  @Column({ name: 'item_code', type: 'varchar', length: 150 })
  item_code!: string;

  @Column({ name: 'item_name', type: 'varchar', length: 255, nullable: true })
  item_name?: string;

  @Column({ type: 'int', default: 0 })
  quantity!: number;
}
