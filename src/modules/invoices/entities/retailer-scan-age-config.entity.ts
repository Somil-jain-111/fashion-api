import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/users.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity('retailer_scan_age_config')
@Index('uq_retailer_scan_age_retailer', ['retailer'], { unique: true })
export class RetailerScanAgeConfigEntity extends BaseEntity {
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer: User;

  @Column({
    name: 'scan_age_days',
    type: 'int',
    unsigned: true,
  })
  scanAgeDays: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;
}
