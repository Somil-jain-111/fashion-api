import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';
import { User } from '../../auth/entities/users.entity';
import { SupportIssueType } from '../enum/support-issue-type.enum';
import { SupportTicketStatus } from '../enum/support-ticket-status.enum';
import { SupportTicketAttachmentEntity } from './support-ticket-attachment.entity';

@Entity({ name: 'support_tickets' })
@Index('uq_support_ticket_no', ['ticket_no'], { unique: true })
@Index('idx_support_tickets_user_id', ['user_id'])
@Index('idx_support_tickets_status', ['status'])
@Index('idx_support_tickets_issue_type', ['issue_type'])
export class SupportTicketEntity extends BaseEntity {
  @Column({ name: 'ticket_no', type: 'varchar', length: 50 })
  ticket_no: string;

  @Column({ type: 'bigint' })
  user_id: string;

  @Column({ name: 'issue_type', type: 'enum', enum: SupportIssueType })
  issue_type: SupportIssueType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  status: SupportTicketStatus;

  @Column({ name: 'resolution_remarks', type: 'text', nullable: true })
  resolution_remarks?: string | null;

  /**
   * The admin who last changed status/remarks — surfaced next to "Last Updated" in the app.
   */
  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updated_by?: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByAdmin?: User | null;

  @OneToMany(() => SupportTicketAttachmentEntity, (attachment) => attachment.ticket)
  attachments: SupportTicketAttachmentEntity[];
}
