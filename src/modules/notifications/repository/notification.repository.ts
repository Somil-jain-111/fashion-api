import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notification, NotificationCategory, NotificationTemplate } from '../entities';

@Injectable()
export class NotificationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(
    recipientId: number,
    options: { category?: NotificationCategory; isRead?: boolean; page: number; limit: number }
  ) {
    const qb = this.dataSource
      .getRepository(Notification)
      .createQueryBuilder('n')
      .select([
        'n.id',
        'n.category',
        'n.title',
        'n.body',
        'n.resourceType',
        'n.resourceId',
        'n.readAt',
        'n.createdAt',
      ])
      .where('n.recipientId = :recipientId', { recipientId })
      .andWhere('(n.expiresAt IS NULL OR n.expiresAt > CURRENT_TIMESTAMP)');
    if (options.category) qb.andWhere('n.category = :category', { category: options.category });
    if (options.isRead === true) qb.andWhere('n.readAt IS NOT NULL');
    if (options.isRead === false) qb.andWhere('n.readAt IS NULL');
    return qb
      .orderBy('n.createdAt', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();
  }

  countUnread(recipientId: number) {
    return this.dataSource
      .getRepository(Notification)
      .createQueryBuilder('n')
      .where('n.recipientId = :recipientId', { recipientId })
      .andWhere('n.readAt IS NULL')
      .andWhere('(n.expiresAt IS NULL OR n.expiresAt > CURRENT_TIMESTAMP)')
      .getCount();
  }

  async markRead(id: number, recipientId: number): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(Notification)
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('id = :id AND recipient_id = :recipientId', { id, recipientId })
      .execute();
    return Boolean(result.affected);
  }

  async markAllRead(recipientId: number): Promise<void> {
    await this.dataSource
      .getRepository(Notification)
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('recipient_id = :recipientId AND read_at IS NULL', { recipientId })
      .execute();
  }

  save(data: Partial<Notification>) {
    const repo = this.dataSource.getRepository(Notification);
    return repo.save(repo.create(data));
  }
}

@Injectable()
export class NotificationTemplateRepository {
  constructor(private readonly dataSource: DataSource) {}
  findAll() {
    return this.dataSource
      .getRepository(NotificationTemplate)
      .find({ order: { code: 'ASC', channel: 'ASC' } });
  }
  find(code: string, channel: string, locale = 'en-IN') {
    return this.dataSource
      .getRepository(NotificationTemplate)
      .findOne({ where: { code, channel: channel as any, locale, active: true } });
  }
  findById(id: number) {
    return this.dataSource.getRepository(NotificationTemplate).findOne({ where: { id } });
  }
  save(data: Partial<NotificationTemplate>) {
    const repo = this.dataSource.getRepository(NotificationTemplate);
    return repo.save(repo.create(data));
  }
}
