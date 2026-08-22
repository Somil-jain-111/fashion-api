import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { SupportTicketEntity } from '../entities/support-ticket.entity';
import { SupportTicketAttachmentEntity } from '../entities/support-ticket-attachment.entity';
import { SupportIssueTypeEntity } from '../entities/support-issue-type.entity';
import { SupportTicketStatus } from '../enum/support-ticket-status.enum';

type TicketFilters = {
  userId?: number;
  status?: SupportTicketStatus;
  issueType?: string;
  fromDate?: string;
  toDate?: string;
};

@Injectable()
export class SupportRepository extends BaseRepository<SupportTicketEntity> {
  constructor(private readonly dataSource: DataSource) {
    super(dataSource.getRepository(SupportTicketEntity));
  }

  findExistingByTicketNo(ticketNo: string, manager?: EntityManager) {
    return (manager?.getRepository(SupportTicketEntity) ?? this.repository).findOne({
      where: { ticket_no: ticketNo },
    });
  }

  saveTicket(
    data: Partial<SupportTicketEntity>,
    manager?: EntityManager
  ): Promise<SupportTicketEntity> {
    const repository = manager?.getRepository(SupportTicketEntity) ?? this.repository;
    return repository.save(repository.create(data));
  }

  saveAttachments(
    rows: Partial<SupportTicketAttachmentEntity>[],
    manager?: EntityManager
  ): Promise<SupportTicketAttachmentEntity[]> {
    if (!rows.length) return Promise.resolve([]);
    const repository =
      manager?.getRepository(SupportTicketAttachmentEntity) ??
      this.dataSource.getRepository(SupportTicketAttachmentEntity);
    return repository.save(repository.create(rows));
  }

  private applyFilters(
    query: SelectQueryBuilder<SupportTicketEntity>,
    filters: TicketFilters
  ): SelectQueryBuilder<SupportTicketEntity> {
    if (filters.userId) {
      query.andWhere('ticket.user_id = :userId', { userId: filters.userId });
    }
    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters.issueType) {
      query.andWhere('ticket.issue_type = :issueType', { issueType: filters.issueType });
    }
    if (filters.fromDate) {
      query.andWhere('ticket.created_at >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      query.andWhere('ticket.created_at <= :toDate', { toDate: filters.toDate });
    }
    return query;
  }

  private baseQuery(): SelectQueryBuilder<SupportTicketEntity> {
    return this.repository
      .createQueryBuilder('ticket')
      .leftJoin('ticket.attachments', 'attachments')
      .addSelect(['attachments.id', 'attachments.url']);
  }

  async findTickets(
    filters: TicketFilters,
    page: number,
    limit: number
  ): Promise<{ items: SupportTicketEntity[]; total: number }> {
    const query = this.applyFilters(this.baseQuery(), filters)
      .orderBy('ticket.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  findTicketById(id: string, userId?: number) {
    const query = this.baseQuery()
      .leftJoin('ticket.updatedByAdmin', 'updatedByAdmin')
      .addSelect(['updatedByAdmin.id', 'updatedByAdmin.firmName', 'updatedByAdmin.username'])
      .where('ticket.id = :id', { id });
    if (userId) {
      query.andWhere('ticket.user_id = :userId', { userId });
    }
    return query.getOne();
  }

  findTicketForUpdate(id: string, manager: EntityManager) {
    return manager
      .getRepository(SupportTicketEntity)
      .createQueryBuilder('ticket')
      .setLock('pessimistic_write')
      .where('ticket.id = :id', { id })
      .getOne();
  }

  async updateTicket(
    id: string,
    data: Partial<SupportTicketEntity>,
    manager: EntityManager
  ): Promise<void> {
    // .save() on a plain partial object (not loaded via find/create) can misfire as an
    // INSERT instead of an UPDATE — .update() always issues a real UPDATE by primary key.
    await manager.getRepository(SupportTicketEntity).update({ id: Number(id) }, data);
  }

  async countByStatusForUser(
    userId: number
  ): Promise<{ open: number; inProgress: number; resolved: number; total: number }> {
    const rows = await this.repository
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ticket.user_id = :userId', { userId })
      .groupBy('ticket.status')
      .getRawMany();

    const counts = { open: 0, inProgress: 0, resolved: 0, total: 0 };
    for (const row of rows) {
      const count = Number(row.count);
      counts.total += count;
      if (row.status === SupportTicketStatus.OPEN) counts.open = count;
      if (row.status === SupportTicketStatus.IN_PROGRESS) counts.inProgress = count;
      if (row.status === SupportTicketStatus.RESOLVED) counts.resolved = count;
    }
    return counts;
  }

  findActiveIssueTypes(): Promise<SupportIssueTypeEntity[]> {
    return this.dataSource
      .getRepository(SupportIssueTypeEntity)
      .createQueryBuilder('issueType')
      .select(['issueType.code', 'issueType.label'])
      .where('issueType.active = :active', { active: true })
      .orderBy('issueType.display_order', 'ASC')
      .getMany();
  }
}
