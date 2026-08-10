import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RedemptionCart } from './redemption-cart.entity';
import { BaseEntity } from '../../../default/common/entities';

export interface RedemptionCartItemMetadata {
  description?: string;
  imageUrl?: string;
  sku?: string;
  mrp?: number;
  cost?: number;
}

@Entity({ name: 'redemption_cart_items' })
@Index('idx_redemption_cart_item_cart', ['cart'])
export class RedemptionCartItem extends BaseEntity {
  @ManyToOne(() => RedemptionCart, (cart) => cart.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'cart_id' })
  cart!: RedemptionCart;

  @Column({ type: 'varchar', length: 255, name: 'product_id' })
  productId!: string;

  @Column({ type: 'varchar', length: 255, name: 'product_name' })
  productName!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'float', default: 0, name: 'price_point' })
  pricePoint!: number;

  @Column({ type: 'varchar', length: 50, default: 'digital', name: 'product_type' })
  productType!: string;

  @Column({ type: 'json', nullable: true })
  metadata?: RedemptionCartItemMetadata | null;
}
