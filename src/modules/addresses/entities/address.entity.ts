import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { User } from '../../auth/entities';
import { addressType } from 'src/default/common/enums/address.enum';

@Entity({ name: 'addresses' })
@Index('idx_addresses_user_id', ['user'])
@Index('idx_addresses_mobile', ['mobile'])
@Index('idx_addresses_pincode', ['pincode'])
@Index('idx_addresses_status', ['status'])
export class Address extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @Column({ type: 'bigint' })
  user_id!: bigint;
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
  addressLine1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine2?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  landmark?: string;

  @Column({ type: 'varchar', length: 10, nullable: false })
  pincode!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cityName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stateName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zoneName?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  @Column({
    type: 'enum',
    enum: addressType,
    nullable: false,
    default: addressType.Primary,
  })
  addressType!: addressType;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'tinyint', default: 1 })
  status!: number; // 1 = Active, 2 = Deleted

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
