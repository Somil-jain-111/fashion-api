import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';

import { User } from '../../auth/entities';
import { addressType } from '../../../default/common/enums/address.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'addresses' })
@Index('idx_addresses_user_id', ['user'])
@Index('idx_addresses_mobile', ['mobile'])
@Index('idx_addresses_pincode', ['pincode'])
export class Address extends BaseEntity {
  @ManyToOne(() => User, (user) => user.addresses, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 15, nullable: false })
  mobile!: string;

  //   @OneToMany(() => ShippingDetail, (sd) => sd.userAddress)
  //   shippingDetail?: ShippingDetail[];

  @Column({ type: 'varchar', length: 255, nullable: false })
  address_line_1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address_line_2?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  landmark?: string;

  @Column({ type: 'varchar', length: 10, nullable: false })
  pincode!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zone_name?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  // @Column({
  //   type: 'enum',
  //   enum: addressType,
  //   nullable: false,
  //   default: addressType.Primary,
  // })
  // addressType!: addressType;

  // @Column({ type: 'boolean', default: false })
  // isDefault!: boolean;
}
