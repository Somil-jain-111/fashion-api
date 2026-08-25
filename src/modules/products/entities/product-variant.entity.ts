import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { Product } from './product.entity';

@Entity('product_variants')
@Unique('UQ_PRODUCT_VARIANT_SKU', ['sku'])
@Index(['productId'])
export class ProductVariant extends BaseEntity {
  @Column({ type: 'bigint', name: 'product_id' })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'varchar', length: 50 })
  size!: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'price_override' })
  priceOverride?: number | null;

  @Column({ type: 'int', default: 0, name: 'stock_quantity' })
  stockQuantity!: number;
}
