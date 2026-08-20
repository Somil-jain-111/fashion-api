import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
//
import { User } from './users.entity';
import { BaseEntity } from '../../../default/common/entities';
import { StoreAddressProofType } from '../../../default/common/enums/user-store.enum';

@Entity('user_store_info')
export class UserStoreInfo extends BaseEntity {
  @OneToOne(() => User, (user) => user.storeInformation, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'decimal', nullable: false })
  lat!: number;

  @Column({ type: 'decimal', nullable: false })
  lng!: number;

  @Column({ type: 'varchar', length: 255, nullable: false, name: 'store_name' })
  storeName!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  address1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address2!: string;

  @Column({ type: 'bigint', nullable: false })
  pincode!: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  city!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  state!: string;

  @Column({ type: 'varchar', length: 500, nullable: false, name: 'store_front_facade_image_url' })
  storeFrontFacadeImageUrl!: string;

  @Column({ type: 'varchar', length: 500, nullable: false, name: 'store_display_image_url' })
  storeDisplayImageUrl!: string;

  @Column({
    type: 'enum',
    enum: StoreAddressProofType,
    default: StoreAddressProofType.ELETRICITY_BILL,
    name: 'address_proof_type',
  })
  addressProofType!: StoreAddressProofType;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'address_proof_image_url' })
  addressProofImageUrl!: string;
}
