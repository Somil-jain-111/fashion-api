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

@Entity('faqs')
export class FaqEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column()
  question!: string;

  @Column({
    type: 'longtext',
  })
  answer!: string;

  @Column({
    nullable: true,
  })
  category?: string;

  @Column({
    unique: true,
    nullable: true,
  })
  url?: string;

  @ManyToMany(() => Roles, (role) => role.faqs)
  @JoinTable({
    name: 'faq_roles',
    joinColumn: {
      name: 'faq_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles!: Roles[];

  @Column({
    name: 'display_order',

    default: 0,
  })
  displayOrder!: number;

  @Column({
    name: 'is_featured',

    default: false,
  })
  isFeatured!: boolean;

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
