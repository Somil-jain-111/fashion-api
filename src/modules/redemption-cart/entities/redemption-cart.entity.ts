import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User, Order } from '../../auth/entities';
import { RedemptionCartStatus } from '../enums/redemption-cart-status.enum';
import { RedemptionCartItem } from './redemption-cart-item.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'redemption_carts' })
@Index('idx_redemption_cart_user', ['user'])
@Index('idx_redemption_cart_status', ['status'])
export class RedemptionCart extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: RedemptionCartStatus,
    default: RedemptionCartStatus.ACTIVE,
  })
  status!: RedemptionCartStatus;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @OneToMany(() => RedemptionCartItem, (item) => item.cart, { cascade: true })
  items!: RedemptionCartItem[];
}
