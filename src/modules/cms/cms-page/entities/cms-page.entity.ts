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
import { CmsType } from '../enum/cms-type.enum';

@Entity('cms_pages')
export class CmsPageEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({
    type: 'enum',
    enum: CmsType,
  })
  type!: CmsType;

  @Column()
  title!: string;

  @Column({
    type: 'longtext',
  })
  description!: string;

  @Column({
    unique: true,
    nullable: true,
  })
  url?: string;

  // Example:
  // terms-and-conditions
  // privacy-policy
  // about-us
  // contact-us

  @ManyToMany(() => Roles, (role) => role.cmsPages)
  @JoinTable({
    name: 'cms_page_roles',
    joinColumn: {
      name: 'cms_page_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles!: Roles[];

  @Column({
    default: 1,
  })
  version!: number;

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
