import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { CreateSupportTicketDto, SupportAttachmentDto } from './dto/support.dto';
import {
  SupportArticle,
  SupportCategory,
  SupportTicket,
  SupportTicketAttachment,
  SupportTicketMessage,
  SupportTicketStatus,
} from './entities';

@Injectable()
export class SupportRepository {
  constructor(private readonly dataSource: DataSource) {}
  categories() {
    return this.dataSource.getRepository(SupportCategory).find({
      where: { active: true },
      select: ['id', 'code', 'name'],
      order: { sortOrder: 'ASC' },
    });
  }
  articles() {
    return this.dataSource.getRepository(SupportArticle).find({
      where: { active: true, locale: 'en-IN' },
      select: ['id', 'type', 'title', 'content', 'url'],
      order: { sortOrder: 'ASC' },
    });
  }

  async createTicket(sellerId: number, dto: CreateSupportTicketDto) {
    return this.dataSource.transaction(async (manager) => {
      const category = await manager
        .getRepository(SupportCategory)
        .findOne({ where: { id: dto.categoryId, active: true } });
      if (!category) return null;
      const ticketRepo = manager.getRepository(SupportTicket);
      const ticket = await ticketRepo.save(
        ticketRepo.create({
          sellerId,
          categoryId: dto.categoryId,
          subject: dto.subject.trim(),
          priority: dto.priority,
          resourceType: dto.resourceType ?? null,
          resourceId: dto.resourceId ?? null,
          ticketNumber: `TKT-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
        })
      );
      await this.addMessage(manager, ticket.id, sellerId, 'SELLER', dto.message, dto.attachments);
      return ticket;
    });
  }

  async addMessage(
    manager: EntityManager,
    ticketId: number,
    senderId: number,
    senderRole: string,
    message: string,
    attachments?: SupportAttachmentDto[]
  ) {
    const repo = manager.getRepository(SupportTicketMessage);
    const saved = await repo.save(
      repo.create({ ticketId, senderId, senderRole, message: message.trim() })
    );
    if (attachments?.length) {
      const attachmentRepo = manager.getRepository(SupportTicketAttachment);
      await attachmentRepo.save(
        attachments.map((a) => attachmentRepo.create({ messageId: saved.id, ...a }))
      );
    }
    return saved;
  }

  async reply(
    ticketId: number,
    sellerId: number,
    senderId: number,
    senderRole: string,
    message: string,
    attachments?: SupportAttachmentDto[],
    admin = false
  ) {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await manager
        .getRepository(SupportTicket)
        .findOne({ where: { id: ticketId, ...(admin ? {} : { sellerId }) } as any });
      if (!ticket || ticket.status === SupportTicketStatus.CLOSED) return null;
      const saved = await this.addMessage(
        manager,
        ticketId,
        senderId,
        senderRole,
        message,
        attachments
      );
      await manager.getRepository(SupportTicket).update(ticketId, {
        status: admin ? SupportTicketStatus.WAITING_SELLER : SupportTicketStatus.OPEN,
      });
      return saved;
    });
  }

  async list(
    sellerId: number | undefined,
    status: SupportTicketStatus | undefined,
    page: number,
    limit: number
  ) {
    const qb = this.dataSource
      .getRepository(SupportTicket)
      .createQueryBuilder('t')
      .leftJoin(SupportCategory, 'c', 'c.id=t.category_id')
      .select([
        't.id AS id',
        't.ticket_number AS ticketNumber',
        't.category_id AS categoryId',
        'c.name AS categoryName',
        't.subject AS subject',
        't.status AS status',
        't.priority AS priority',
        't.resource_type AS resourceType',
        't.resource_id AS resourceId',
        't.assigned_to AS assignedTo',
        't.resolution_remark AS resolutionRemark',
        't.created_at AS createdAt',
        't.updated_at AS updatedAt',
      ]);
    if (sellerId) qb.where('t.seller_id=:sellerId', { sellerId });
    if (status) qb.andWhere('t.status=:status', { status });
    const total = await qb.getCount();
    const items = await qb
      .orderBy('t.updated_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();
    return { items, total };
  }

  async detail(id: number, sellerId?: number) {
    const ticket = await this.dataSource
      .getRepository(SupportTicket)
      .createQueryBuilder('t')
      .leftJoin(SupportCategory, 'c', 'c.id=t.category_id')
      .select([
        't.id AS id',
        't.ticket_number AS ticketNumber',
        't.category_id AS categoryId',
        'c.name AS categoryName',
        't.subject AS subject',
        't.status AS status',
        't.priority AS priority',
        't.resource_type AS resourceType',
        't.resource_id AS resourceId',
        't.assigned_to AS assignedTo',
        't.resolution_remark AS resolutionRemark',
        't.created_at AS createdAt',
        't.updated_at AS updatedAt',
      ])
      .where('t.id=:id', { id })
      .andWhere(sellerId ? 't.seller_id=:sellerId' : '1=1', { sellerId })
      .getRawOne();
    if (!ticket) return null;
    const messages = await this.dataSource.getRepository(SupportTicketMessage).find({
      where: { ticketId: id, isInternal: false },
      select: ['id', 'senderId', 'senderRole', 'message', 'createdAt'],
      order: { id: 'ASC' },
    });
    const ids = messages.map((m) => m.id);
    const attachments = ids.length
      ? await this.dataSource
          .getRepository(SupportTicketAttachment)
          .createQueryBuilder('a')
          .select(['a.id', 'a.messageId', 'a.url', 'a.fileName', 'a.mimeType'])
          .where('a.messageId IN (:...ids)', { ids })
          .getMany()
      : [];
    return {
      ...ticket,
      messages: messages.map((m) => ({
        ...m,
        attachments: attachments.filter((a) => Number(a.messageId) === Number(m.id)),
      })),
    };
  }

  async updateStatus(id: number, data: Partial<SupportTicket>) {
    const ticket = await this.dataSource.getRepository(SupportTicket).findOne({ where: { id } });
    if (!ticket) return null;
    await this.dataSource.getRepository(SupportTicket).update(id, data);
    return this.detail(id);
  }
}
