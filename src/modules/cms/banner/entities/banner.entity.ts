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
import { BannerRedirectType } from '../enum/banner-redirect-type.enum';
import { BannerPosition } from '../enum/banner-position.enum';

@Entity('banners')
export class BannerEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  subtitle?: string;

  @Column()
  image!: string;

  @Column({
    type: 'enum',
    enum: BannerPosition,
  })
  position!: BannerPosition;

  @Column({
    name: 'redirect_type',
    type: 'enum',
    enum: BannerRedirectType,
    default: BannerRedirectType.NONE,
  })
  redirectType!: BannerRedirectType;

  @Column({
    name: 'redirect_value',
    nullable: true,
  })
  redirectValue?: string;

  @ManyToMany(() => Roles, (role) => role.banners, {
    cascade: false,
  })
  @JoinTable({
    name: 'banner_roles',
    joinColumn: {
      name: 'banner_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles!: Roles[];

  @Column({ default: 0 })
  priority!: number;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'start_date',
    type: 'timestamp',
    nullable: true,
  })
  startDate?: Date;

  @Column({
    name: 'end_date',
    type: 'timestamp',
    nullable: true,
  })
  endDate?: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
