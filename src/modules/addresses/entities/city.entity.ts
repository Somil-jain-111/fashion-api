import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { State, Pincode } from '../../auth/entities';

@Entity({ name: 'cities' })
@Index('idx_city_state', ['state'])
@Index('idx_city_status', ['status'])
export class City extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @ManyToOne(() => State, (s) => s.city)
  @JoinColumn({ name: 'state_id' })
  state!: State;

  @OneToMany(() => Pincode, (p) => p.city)
  pincode!: Pincode[];

  @Column({ type: 'tinyint', default: 1 })
  status?: number;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;
}
