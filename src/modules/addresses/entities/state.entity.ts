import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Region, City } from '../../auth/entities';

@Entity({ name: 'states' })
export class State extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @ManyToOne(() => Region, (r) => r.state)
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @OneToMany(() => City, (city) => city.state)
  city!: City[];

  @Column({ type: 'tinyint', default: 1 })
  status!: number;
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
