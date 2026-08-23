import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';
import { User } from '../../auth/entities/users.entity';
import { DistributorReturnDetailEntity } from './distributor-return-detail.entity';

/**
 * One row per invoice per return batch — a distributor can scan and process pairs from
 * several different invoices (and therefore several different retailers) in a single
 * request; each invoice gets its own return row here, with the individual pairs recorded in
 * distributor_return_details.
 */
@Entity({ name: 'distributor_returns' })
@Index('uq_distributor_return_no', ['return_no'], { unique: true })
@Index('idx_distributor_returns_invoice_id', ['invoice'])
@Index('idx_distributor_returns_retailer_id', ['retailer'])
@Index('idx_distributor_returns_distributor_id', ['distributor'])
export class DistributorReturnEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'return_no', type: 'varchar', length: 50 })
  return_no: string;

  @Column({ name: 'total_pairs', type: 'int', default: 0 })
  total_pairs: number;

  @Column({ name: 'total_points_refunded', type: 'int', default: 0 })
  total_points_refunded: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'retailer_id' })
  retailer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'distributor_id' })
  distributor: User;

  @OneToMany(() => DistributorReturnDetailEntity, (detail) => detail.return, { cascade: true })
  details: DistributorReturnDetailEntity[];
}
