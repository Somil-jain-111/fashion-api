import { Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities';

/**
 * Created once when a user onboards as a seller (SellersService.onboard) — deliberately
 * minimal (just the store name) since PAN/GST/Aadhaar already live in kyc_verifications,
 * not duplicated here.
 */
@Entity('store_information')
@Unique('UQ_STORE_INFORMATION_SELLER', ['sellerId'])
export class StoreInformation extends BaseEntity {
  @Column({ type: 'bigint', name: 'seller_id' })
  sellerId!: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ type: 'varchar', length: 150, name: 'store_name' })
  storeName!: string;
}
