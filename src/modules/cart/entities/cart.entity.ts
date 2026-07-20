import { BaseEntity } from 'src/default/common/entities';
import { User } from 'src/modules/auth/entities';
import { CartItem } from './cart-items.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';

@Entity('carts')
@Index(['user_id', 'distributor_id'])
export class Cart extends BaseEntity {
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
