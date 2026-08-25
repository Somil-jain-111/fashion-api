import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { ProductStatus, ProductZone } from '../../../default/common/enums/product.enum';
import { User } from '../../auth/entities';
import { Category } from '../../categories/entities';
import { ProductVariant } from './product-variant.entity';
import { ProductImage } from './product-image.entity';

@Entity('products')
@Index(['sellerId'])
@Index(['categoryId'])
@Index(['status'])
export class Product extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' })
  sellerId!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ type: 'bigint', name: 'category_id' })
  categoryId!: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_price' })
  basePrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'wholesale_price' })
  wholesalePrice?: number | null;

  /**
   * Retail strikethrough pricing — additive to basePrice/wholesalePrice, not a
   * replacement. currentPrice is server-computed (mrp * (1 - discountPercentage/100))
   * and kept in sync by ProductsService whenever mrp/discountPercentage change;
   * never accepted directly from a request body.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  mrp?: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'discount_percentage' })
  discountPercentage?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'current_price' })
  currentPrice?: number | null;

  @Column({ type: 'enum', enum: ProductZone })
  zone!: ProductZone;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status!: ProductStatus;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason?: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'rating_average' })
  ratingAverage!: number;

  @Column({ type: 'int', default: 0, name: 'rating_count' })
  ratingCount!: number;

  @Column({ type: 'bigint', nullable: true, name: 'reviewed_by' })
  reviewedBy?: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User | null;

  @Column({ type: 'datetime', nullable: true, name: 'reviewed_at' })
  reviewedAt?: Date | null;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants?: ProductVariant[];

  @OneToMany(() => ProductImage, (image) => image.product)
  images?: ProductImage[];
}
