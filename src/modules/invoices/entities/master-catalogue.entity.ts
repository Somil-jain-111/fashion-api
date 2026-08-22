import { BaseEntity } from '../../../default/common/entities';
import { Column, Entity, Index } from 'typeorm';

@Entity('master_catalogue')
@Index('uq_master_catalogue_item_code', ['itemCode'], { unique: true })
export class MasterCatalogueEntity extends BaseEntity {
  @Column({
    name: 'item_code',
    type: 'varchar',
    length: 150,
  })
  itemCode: string;

  @Column({
    name: 'item_name',
    type: 'varchar',
    length: 255,
  })
  itemName: string;

  @Column({
    name: 'wholesaler_rate',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  wholesalerRate: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  mrp?: string;

  @Column({
    name: 'effective_from',
    type: 'date',
    nullable: true,
  })
  effectiveFrom?: Date;
}
