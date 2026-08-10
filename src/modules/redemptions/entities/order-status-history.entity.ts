import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enum/order-status.enum';

@Entity({ name: 'order_status_history' })
export class OrderStatusHistory extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: bigint;

  @ManyToOne(() => OrderItem, (item) => item.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem!: OrderItem;

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  remark!: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;
}
