import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';

export enum ProductOptionGroup {
  BRAND = 'BRAND',
  PRODUCT_TYPE = 'PRODUCT_TYPE',
  GENDER = 'GENDER',
  COUNTRY = 'COUNTRY',
  MATERIAL = 'MATERIAL',
  FIT = 'FIT',
  NECK_TYPE = 'NECK_TYPE',
  SLEEVE = 'SLEEVE',
  OCCASION = 'OCCASION',
  COLOR = 'COLOR',
  SIZE = 'SIZE',
}

@Entity('product_options')
@Unique('UQ_PRODUCT_OPTION_GROUP_CODE', ['group', 'code'])
@Index(['group', 'isActive', 'sortOrder'])
@Index(['categoryId'])
export class ProductOption extends BaseEntity {
  @Column({ type: 'enum', enum: ProductOptionGroup })
  group!: ProductOptionGroup;

  @Column({ type: 'varchar', length: 80 })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'bigint', nullable: true, name: 'category_id' })
  categoryId?: number | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;
}
