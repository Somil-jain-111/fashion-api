import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';

import { Cart } from './cart.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity('cart_items')
@Index(['cart', 'productId'])
export class CartItem extends BaseEntity {
  @ManyToOne(() => Cart, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column()
  productId: number;

  @Column()
  categoryId: number;

  @Column()
  subCategoryId: number;

  @Column()
  color: string;

  @Column()
  size: string;

  @Column()
  cartonSize: number;

  @Column({
    default: 1,
  })
  cartonQuantity: number;

  @Column()
  totalArticles: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  unitPrice: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  mrp: number;

  @Column({
    default: 0,
  })
  discount: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  totalAmount: number;

  @Column({
    default: true,
  })
  isSelected: boolean;
}
