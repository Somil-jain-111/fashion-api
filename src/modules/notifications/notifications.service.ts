import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { NotificationCategory, NotificationChannel } from './entities';
import { ListNotificationsQueryDto, SaveNotificationTemplateDto } from './dto/notification.dto';
import {
  NotificationRepository,
  NotificationTemplateRepository,
} from './repository/notification.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly templates: NotificationTemplateRepository
  ) {}

  async list(userId: number, query: ListNotificationsQueryDto) {
    const [result, unreadCount] = await Promise.all([
      this.notifications.list(userId, query),
      this.notifications.countUnread(userId),
    ]);
    const [items, total] = result;
    return {
      items: items.map((item) => ({
        id: String(item.id),
        category: String(item.category),
        title: item.title,
        body: item.body,
        resourceType: String(item.resourceType ?? ''),
        resourceId: String(item.resourceId ?? ''),
        isRead: String(Boolean(item.readAt)),
        readAt: item.readAt?.toISOString() ?? '',
        createdAt: item.createdAt.toISOString(),
      })),
      unreadCount: String(unreadCount),
      page: String(query.page),
      limit: String(query.limit),
      total: String(total),
      totalPages: String(Math.ceil(total / query.limit)),
    };
  }

  async unreadCount(userId: number) {
    return { unreadCount: String(await this.notifications.countUnread(userId)) };
  }

  async markRead(userId: number, id: number) {
    if (!(await this.notifications.markRead(id, userId)))
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_NOT_FOUND);
    return { updated: 'true' };
  }

  async markAllRead(userId: number) {
    await this.notifications.markAllRead(userId);
    return { updated: 'true' };
  }

  listTemplates() {
    return this.templates.findAll();
  }

  async createTemplate(dto: SaveNotificationTemplateDto) {
    const exists = await this.templates.find(dto.code, dto.channel, dto.locale ?? 'en-IN');
    if (exists)
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_TEMPLATE_ALREADY_EXISTS);
    return this.templates.save({
      ...dto,
      code: dto.code.toUpperCase(),
      locale: dto.locale ?? 'en-IN',
    });
  }

  async updateTemplate(id: number, dto: SaveNotificationTemplateDto) {
    const current = await this.templates.findById(id);
    if (!current)
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_TEMPLATE_NOT_FOUND);
    return this.templates.save({ ...current, ...dto, id, version: current.version + 1 });
  }

  async createFromTemplate(input: {
    recipientId: number;
    templateCode: string;
    category: NotificationCategory;
    variables: Record<string, string | number>;
    resourceType?: string;
    resourceId?: string;
    dedupeKey?: string;
  }) {
    const template = await this.templates.find(input.templateCode, NotificationChannel.IN_APP);
    if (!template)
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_TEMPLATE_NOT_FOUND);
    const allowed = new Set(template.allowedVariables ?? []);
    const render = (source: string) =>
      source.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_match, key) => {
        if (!allowed.has(key)) return '';
        return String(input.variables[key] ?? '');
      });
    return this.notifications.save({
      recipientId: input.recipientId,
      templateCode: template.code,
      category: input.category,
      title: render(template.title),
      body: render(template.body),
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: input.variables,
      dedupeKey: input.dedupeKey ?? null,
    });
  }
}
