import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';

export enum CategoryStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('categories')
@Unique('UQ_CATEGORY_SLUG', ['slug'])
@Index(['parentId'])
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 170 })
  slug!: string;

  @Column({ type: 'bigint', nullable: true, name: 'parent_id' })
  parentId?: number | null;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children?: Category[];

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl?: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 8, name: 'commission_rate' })
  commissionRate!: number;

  @Column({ type: 'enum', enum: CategoryStatus, default: CategoryStatus.APPROVED })
  status!: CategoryStatus;

  @Column({ type: 'bigint', nullable: true, name: 'created_by' })
  createdBy?: number | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string | null;

  @Column({ type: 'bigint', nullable: true, name: 'reviewed_by' })
  reviewedBy?: number | null;

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date | null;
}
