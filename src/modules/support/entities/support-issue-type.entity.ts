import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../default/common/entities';

/**
 * DB-backed source for the "Issue Type" dropdown on the raise-ticket screen. `code` must
 * stay in sync with the SupportIssueType TS enum — support_tickets.issue_type is still a
 * fixed enum column (validated via CreateSupportTicketDto), this table only drives what the
 * client shows as selectable options.
 */
@Entity({ name: 'support_issue_types' })
@Index('uq_support_issue_type_code', ['code'], { unique: true })
export class SupportIssueTypeEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  display_order: number;
}
