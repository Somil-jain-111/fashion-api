import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/default/common/entities';

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_SELLER = 'WAITING_SELLER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}
export enum SupportPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}
export enum SupportArticleType {
  FAQ = 'FAQ',
  GUIDE = 'GUIDE',
  CONTACT = 'CONTACT',
}

@Entity('support_categories')
export class SupportCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 80, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ type: 'int', default: 0, name: 'sort_order' }) sortOrder!: number;
}

@Entity('support_articles')
@Index(['type', 'active', 'sortOrder'])
export class SupportArticle extends BaseEntity {
  @Column({ type: 'enum', enum: SupportArticleType }) type!: SupportArticleType;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text', nullable: true }) content?: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) url?: string | null;
  @Column({ type: 'varchar', length: 10, default: 'en-IN' }) locale!: string;
  @Column({ type: 'int', default: 0, name: 'sort_order' }) sortOrder!: number;
}

@Entity('support_tickets')
@Index(['sellerId', 'updatedAt'])
@Index(['status', 'priority', 'updatedAt'])
export class SupportTicket extends BaseEntity {
  @Column({ type: 'varchar', length: 30, unique: true, name: 'ticket_number' })
  ticketNumber!: string;
  @Column({ type: 'bigint', name: 'seller_id' }) sellerId!: number;
  @Column({ type: 'bigint', name: 'category_id' }) categoryId!: number;
  @Column({ type: 'varchar', length: 200 }) subject!: string;
  @Column({ type: 'enum', enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  status!: SupportTicketStatus;
  @Column({ type: 'enum', enum: SupportPriority, default: SupportPriority.NORMAL })
  priority!: SupportPriority;
  @Column({ type: 'varchar', length: 80, nullable: true, name: 'resource_type' }) resourceType?:
    string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'resource_id' }) resourceId?:
    string | null;
  @Column({ type: 'bigint', nullable: true, name: 'assigned_to' }) assignedTo?: number | null;
  @Column({ type: 'datetime', nullable: true, name: 'resolved_at' }) resolvedAt?: Date | null;
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'resolution_remark' })
  resolutionRemark?: string | null;
}

@Entity('support_ticket_messages')
@Index(['ticketId', 'createdAt'])
export class SupportTicketMessage extends BaseEntity {
  @Column({ type: 'bigint', name: 'ticket_id' }) ticketId!: number;
  @Column({ type: 'bigint', name: 'sender_id' }) senderId!: number;
  @Column({ type: 'varchar', length: 30, name: 'sender_role' }) senderRole!: string;
  @Column({ type: 'text' }) message!: string;
  @Column({ type: 'boolean', default: false, name: 'is_internal' }) isInternal!: boolean;
}

@Entity('support_ticket_attachments')
@Index(['messageId'])
export class SupportTicketAttachment extends BaseEntity {
  @Column({ type: 'bigint', name: 'message_id' }) messageId!: number;
  @Column({ type: 'varchar', length: 500 }) url!: string;
  @Column({ type: 'varchar', length: 120, nullable: true, name: 'file_name' }) fileName?:
    string | null;
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'mime_type' }) mimeType?:
    string | null;
}
