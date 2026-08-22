import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InvoiceEntity } from '../../invoices/entities/invoice.entity';
import { User } from '../../auth/entities/users.entity';
import { TransferRequestStatus } from '../enum/transfer-request-status.enum';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'invoice_transfer_requests' })
@Index('uq_invoice_transfer_request_no', ['request_no'], { unique: true })
@Index('idx_invoice_transfer_requests_invoice_id', ['invoice'])
@Index('idx_invoice_transfer_requests_from_distributor_id', ['from_distributor_id'])
@Index('idx_invoice_transfer_requests_to_distributor_id', ['to_distributor_id'])
@Index('idx_invoice_transfer_requests_status', ['status'])
export class InvoiceTransferRequestEntity extends BaseEntity {
  @Column({ name: 'request_no', type: 'varchar', length: 50 })
  request_no: string;

  @Column({ name: 'invoice_no', type: 'varchar', length: 100 })
  invoice_no: string;

  @Column({ type: 'bigint' })
  from_distributor_id: string;

  /**
   * Null until another distributor allocates themselves to this request — a request is
   * created against just the invoice, open for any eligible distributor to claim.
   */
  @Column({ type: 'bigint', nullable: true })
  to_distributor_id?: string | null;

  @Column({ name: 'total_pairs', type: 'int', default: 0 })
  total_pairs: number;

  @Column({ name: 'sku_count', type: 'int', default: 0 })
  sku_count: number;

  @Column({ name: 'billing_estimate', type: 'decimal', precision: 15, scale: 2, default: 0 })
  billing_estimate: string;

  @Column({
    type: 'enum',
    enum: TransferRequestStatus,
    default: TransferRequestStatus.PENDING_APPROVAL,
  })
  status: TransferRequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remarks?: string | null;

  @ManyToOne(() => InvoiceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: InvoiceEntity;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_distributor_id' })
  fromDistributor: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'to_distributor_id' })
  toDistributor?: User | null;
}
