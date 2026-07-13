import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { City } from '../../auth/entities';

@Entity({ name: 'pincodes' })
@Index('idx_pincode_value', ['pincode'])
@Index('idx_pincode_city', ['city'])
/* 🔒 Prevent duplicate pincode inside same city */
@Unique('uq_city_pincode', ['city', 'pincode'])
export class Pincode extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @ManyToOne(() => City, (c) => c.pincode)
  @JoinColumn({ name: 'city_id' })
  city!: City;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pincode?: string;

  @Column({ type: 'tinyint', default: 1 })
  status?: number;
  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
