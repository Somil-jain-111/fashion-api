import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { CustomerReturnEntity } from './customer-return.entity';

@Entity({ name: 'customer_return_attachments' })
@Index('idx_cr_attachments_return_id', ['customerReturn'])
export class CustomerReturnAttachmentEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 500 })
  url: string;

  @ManyToOne(() => CustomerReturnEntity, (cr) => cr.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_return_id' })
  customerReturn: CustomerReturnEntity;
}
