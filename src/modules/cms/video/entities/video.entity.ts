import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  BaseEntity,
} from 'typeorm';
import { Roles } from '../../../auth/entities/index';

@Entity('videos')
export class VideoEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column()
  title!: string;

  @Column({
    type: 'longtext',
    nullable: true,
  })
  description?: string;

  @Column()
  link!: string;

  @Column({
    name: 'thumbnail_url',
    nullable: true,
  })
  thumbnailUrl?: string;

  @ManyToMany(() => Roles, (role) => role.videos)
  @JoinTable({
    name: 'video_roles',
    joinColumn: {
      name: 'video_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles!: Roles[];

  @Column({
    default: 0,
  })
  priority!: number;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
