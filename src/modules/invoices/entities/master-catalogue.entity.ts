import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('master_catalogue')
@Index(
  'uq_master_catalogue_item_code',
  ['itemCode'],
  { unique: true },
)
export class MasterCatalogueEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

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
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @Column({
    name: 'effective_from',
    type: 'date',
    nullable: true,
  })
  effectiveFrom?: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}