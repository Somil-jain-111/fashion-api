import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities';
import { CartItem } from './cart-items.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';

@Entity('carts')
@Index('idx_carts_user_id', ['user'])
@Index('idx_carts_distributor_id', ['distributor'])
export class Cart extends BaseEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'distributor_id' })
  distributor: User;

  @OneToMany(() => CartItem, (item) => item.cart)
  items: CartItem[];

  @Column({
    default: 0,
  })
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

  @Column({
    default: true,
  })
  is_active: boolean;
}
