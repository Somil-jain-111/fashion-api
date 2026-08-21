import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity({ name: 'support_ticket_attachments' })
@Index('idx_support_ticket_attachments_ticket_id', ['ticket_id'])
export class SupportTicketAttachmentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint' })
  ticket_id: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => SupportTicketEntity, (ticket) => ticket.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicketEntity;
}
