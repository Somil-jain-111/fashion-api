import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('retailer_scan_age_config')
@Index(
  'uq_retailer_scan_age_retailer',
  ['retailerId'],
  { unique: true },
)
export class RetailerScanAgeConfigEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: string;

  @Column({
    name: 'retailer_id',
    type: 'bigint',
    unsigned: true,
  })
  retailerId: string;

  @Column({
    name: 'scan_age_days',
    type: 'int',
    unsigned: true,
  })
  scanAgeDays: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
  })
  updatedBy: string;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}