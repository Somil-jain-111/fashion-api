import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index, OneToOne } from 'typeorm';
//
import { User } from '../../auth/entities';
import { RedemptionCartItem } from './redemption-cart-item.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'redemption_carts' })
@Index('idx_redemption_cart_user', ['user'])
export class RedemptionCart extends BaseEntity {
  @OneToOne(() => User, (user) => user.redemptionCart, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int', default: 0, name: 'total_items' })
  totalItems!: number;

  @Column({ type: 'float', default: 0, name: 'total_base_points' })
  totalBasePoints!: number;

  @Column({ type: 'float', default: 0, name: 'tds_points' })
  tdsPoints!: number;

  @Column({ type: 'float', default: 0, name: 'tds_percentage' })
  tdsPercentage!: number;

  @Column({ type: 'float', default: 0, name: 'grand_total_points' })
  grandTotalPoints!: number;

  @Column({ type: 'boolean', default: false, name: 'is_pan_verified' })
  isPanVerified!: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_physical_product' })
  hasPhysicalProduct!: boolean;

  @Column({ type: 'json', nullable: true, name: 'extra_info' })
  extraInfo?: Record<string, any> | null;

  @OneToMany(() => RedemptionCartItem, (item) => item.cart, { cascade: true })
  items!: RedemptionCartItem[];
}
