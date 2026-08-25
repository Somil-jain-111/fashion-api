import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('product_images')
@Index(['productId'])
export class ProductImage extends BaseEntity {
  @Column({ type: 'bigint', name: 'product_id' })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'bigint', nullable: true, name: 'variant_id' })
  variantId?: number | null;

  /**
   * SET NULL (not CASCADE) — deleting a variant (e.g. on a full-replace update)
   * must never silently delete the image row, only detach it back to being a
   * general product image.
   */
  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant | null;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder!: number;
}
