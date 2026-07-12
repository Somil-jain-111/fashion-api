import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  BaseEntity,
  OneToMany,
} from 'typeorm';
import { State } from '../../auth/entities';

@Entity({ name: 'regions' })
@Unique(['name'])
export class Region extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @OneToMany(() => State, (s) => s.region)
  state!: State[];

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
