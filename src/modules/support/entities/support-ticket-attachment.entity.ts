import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SupportTicketEntity } from './support-ticket.entity';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'support_ticket_attachments' })
@Index('idx_support_ticket_attachments_ticket_id', ['ticket_id'])
export class SupportTicketAttachmentEntity extends BaseEntity {
  @Column({ type: 'bigint' })
  ticket_id: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @ManyToOne(() => SupportTicketEntity, (ticket) => ticket.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicketEntity;
}
