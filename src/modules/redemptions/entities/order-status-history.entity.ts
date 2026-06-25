import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Order } from "./order.entity";
import { OrderStatus } from "../enum/order-status.enum";

@Entity({ name: "order_status_history" })
export class OrderStatusHistory extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: bigint;

  @ManyToOne(() => Order, (order) => order.statusHistory)
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @Column({
    type: "enum",
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @Column({ type: "text", nullable: true })
  remark!: string;

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;
}
