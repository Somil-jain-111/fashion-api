import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities';
import { OrderPlacementSource, OrderPlacementStatus } from '../enum/order-placement.enum';
import { OrderPlacementItem } from './order-placement-item.entity';

@Entity('order_placements')
@Index(['user_id', 'distributor_id'])
@Index(['orderNumber'])
export class OrderPlacement extends BaseEntity {
  @Column({ length: 40, unique: true })
  orderNumber: string;

  @Column({ type: 'bigint' })
  user_id!: string;

  @Column({ type: 'bigint' })
  distributor_id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'distributor_id' })
  distributor: User;

  @Column({
    type: 'enum',
    enum: OrderPlacementSource,
  })
  source: OrderPlacementSource;

  @Column({
    type: 'enum',
    enum: OrderPlacementStatus,
    default: OrderPlacementStatus.PLACED,
  })
  status: OrderPlacementStatus;

  @Column({ default: 0 })
  totalQuantity: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    default: 0,
  })
  gstAmount: number;

  @Column('decimal', {
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalPayable: number;

  @OneToMany(() => OrderPlacementItem, (item) => item.order)
  items: OrderPlacementItem[];
}
