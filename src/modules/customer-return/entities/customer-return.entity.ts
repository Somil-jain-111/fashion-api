import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities/users.entity';
import { CustomerReturnStatus } from '../enum/customer-return.enum';
import { CustomerReturnItemEntity } from './customer-return-item.entity';

@Entity({ name: 'customer_returns' })
@Index('uq_customer_returns_return_number', ['return_number'], { unique: true })
@Index('idx_customer_returns_retailer_id', ['retailer'])
@Index('idx_customer_returns_status', ['status'])
export class CustomerReturnEntity extends BaseEntity {
  @Column({ name: 'return_number', type: 'varchar', length: 50 })
  return_number: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer: User;

  @Column({ name: 'total_pairs', type: 'int', default: 0 })
  total_pairs: number;

  @Column({
    type: 'enum',
    enum: CustomerReturnStatus,
    default: CustomerReturnStatus.PENDING,
  })
  status: CustomerReturnStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @OneToMany(() => CustomerReturnItemEntity, (item) => item.customerReturn)
  items: CustomerReturnItemEntity[];
}
