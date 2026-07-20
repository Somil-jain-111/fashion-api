import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../default/common/entities';
import { OrderPlacement } from './order-placement.entity';

@Entity('order_placement_items')
@Index('idx_order_placement_items_order_id', ['order_id'])
@Index('idx_order_placement_items_product_id', ['productId'])
export class OrderPlacementItem extends BaseEntity {
  @Column({ type: 'bigint' })
  order_id!: number;

  @ManyToOne(() => OrderPlacement, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: OrderPlacement;

  @Column()
  productId: number;

  @Column()
  categoryId: number;

  @Column()
  subCategoryId: number;

  @Column({ length: 255 })
  productName: string;

  @Column({ length: 500, nullable: true })
  thumbnail: string | null;

  @Column({ length: 100 })
  color: string;

  @Column({ length: 30 })
  size: string;

  @Column()
  cartonSize: number;

  @Column({ default: 1 })
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

  @Column('decimal', {
    precision: 10,
    scale: 2,
    default: 0,
  })
  discount: number;

  @Column('decimal', {
    precision: 10,
    scale: 2,
  })
  totalAmount: number;
}
