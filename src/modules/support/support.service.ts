import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import {
  AdminUpdateTicketDto,
  CreateSupportTicketDto,
  ListSupportTicketsQueryDto,
  ReplySupportTicketDto,
} from './dto/support.dto';
import { SupportArticleType, SupportTicketStatus } from './entities';
import { SupportRepository } from './support.repository';

@Injectable()
export class SupportService {
  constructor(private readonly repository: SupportRepository) {}
  async overview(sellerId: number) {
    const [articles, categories, tickets] = await Promise.all([
      this.repository.articles(),
      this.repository.categories(),
      this.repository.list(sellerId, undefined, 1, 5),
    ]);
    const mapArticle = (a: any) => ({
      id: String(a.id),
      type: String(a.type),
      title: String(a.title),
      content: String(a.content ?? ''),
      url: String(a.url ?? ''),
    });
    return {
      documentation: articles.filter((a) => a.type === SupportArticleType.GUIDE).map(mapArticle),
      contactSupport: articles.filter((a) => a.type === SupportArticleType.CONTACT).map(mapArticle),
      faqs: articles.filter((a) => a.type === SupportArticleType.FAQ).map(mapArticle),
      categories: categories.map((c) => ({ id: String(c.id), code: c.code, name: c.name })),
      recentTickets: tickets.items.map(this.mapTicket),
    };
  }
  async create(sellerId: number, dto: CreateSupportTicketDto) {
    const ticket = await this.repository.createTicket(sellerId, dto);
    if (!ticket) throw new BusinessException(ERROR_CODES.VALIDATION.INVALID_PAYLOAD);
    return this.detail(sellerId, ticket.id);
  }
  async list(sellerId: number, q: ListSupportTicketsQueryDto) {
    const r = await this.repository.list(sellerId, q.status, q.page, q.limit);
    return {
      items: r.items.map(this.mapTicket),
      page: String(q.page),
      limit: String(q.limit),
      total: String(r.total),
      totalPages: String(Math.ceil(r.total / q.limit)),
    };
  }
  async detail(sellerId: number, id: number) {
    const t = await this.repository.detail(id, sellerId);
    if (!t) throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
    return this.mapTicket(t);
  }
  async reply(sellerId: number, id: number, dto: ReplySupportTicketDto) {
    const r = await this.repository.reply(
      id,
      sellerId,
      sellerId,
      'SELLER',
      dto.message,
      dto.attachments
    );
    if (!r) throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
    return this.detail(sellerId, id);
  }
  async adminList(q: ListSupportTicketsQueryDto) {
    const r = await this.repository.list(undefined, q.status, q.page, q.limit);
    return {
      items: r.items.map(this.mapTicket),
      page: String(q.page),
      limit: String(q.limit),
      total: String(r.total),
      totalPages: String(Math.ceil(r.total / q.limit)),
    };
  }
  async adminDetail(id: number) {
    const t = await this.repository.detail(id);
    if (!t) throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
    return this.mapTicket(t);
  }
  async adminReply(adminId: number, id: number, dto: ReplySupportTicketDto) {
    const r = await this.repository.reply(
      id,
      0,
      adminId,
      'ADMIN',
      dto.message,
      dto.attachments,
      true
    );
    if (!r) throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
    return this.adminDetail(id);
  }
  async adminUpdate(id: number, dto: AdminUpdateTicketDto) {
    if (dto.status === SupportTicketStatus.RESOLVED && !dto.resolutionRemark)
      throw new BusinessException(ERROR_CODES.SUPPORT.RESOLUTION_REMARKS_REQUIRED);
    const t = await this.repository.updateStatus(id, {
      status: dto.status,
      assignedTo: dto.assignedTo,
      resolutionRemark: dto.resolutionRemark,
      resolvedAt: dto.status === SupportTicketStatus.RESOLVED ? new Date() : null,
    });
    if (!t) throw new BusinessException(ERROR_CODES.SUPPORT.TICKET_NOT_FOUND);
    return this.mapTicket(t);
  }
  private mapTicket = (t: any) => ({
    id: String(t.id),
    ticketNumber: String(t.ticketNumber),
    categoryId: String(t.categoryId),
    categoryName: String(t.categoryName ?? ''),
    subject: String(t.subject),
    status: String(t.status),
    priority: String(t.priority),
    resourceType: String(t.resourceType ?? ''),
    resourceId: String(t.resourceId ?? ''),
    assignedTo: String(t.assignedTo ?? ''),
    resolutionRemark: String(t.resolutionRemark ?? ''),
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt ?? ''),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt ?? ''),
    ...(t.messages && {
      messages: t.messages.map((m: any) => ({
        id: String(m.id),
        senderId: String(m.senderId),
        senderRole: String(m.senderRole),
        message: String(m.message),
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
        attachments: (m.attachments ?? []).map((a: any) => ({
          id: String(a.id),
          url: String(a.url),
          fileName: String(a.fileName ?? ''),
          mimeType: String(a.mimeType ?? ''),
        })),
      })),
    }),
  });
}
