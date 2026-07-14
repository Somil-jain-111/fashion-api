import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { Order } from '../../auth/entities';
import { ShippingStatus } from '../enum/order-status.enum';
import { BaseEntity } from 'src/default/common/entities';

@Entity({ name: 'shipping_details' })
@Index('idx_shipping_order', ['order'])
@Index('idx_shipping_delivery_status', ['delivery_status'])
export class ShippingDetail extends BaseEntity {
  @Column({ type: 'bigint' })
  order_id!: string;

  @OneToOne(() => Order, (order) => order.shippingDetail)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ type: 'timestamp', nullable: true })
  ship_date?: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_number?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  tracking_url?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pod_link?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  delivery_partner?: string | null;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

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

  @Column({
    type: 'enum',
    enum: ShippingStatus,
    default: ShippingStatus.PENDING,
  })
  delivery_status!: ShippingStatus;

  @Column({ type: 'varchar', length: 15, nullable: false })
  mobile!: string;

  @Column({ type: 'varchar', name: 'error_message', nullable: true })
  errorMessage?: string | null;
}
