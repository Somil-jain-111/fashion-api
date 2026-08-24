import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends BaseRepository<NotificationEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(NotificationEntity));
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
    unreadOnly?: boolean
  ): Promise<{ items: NotificationEntity[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (unreadOnly) {
      qb.andWhere('notification.is_read = false');
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  findOwnedById(id: string, userId: string) {
    return this.repository.findOne({ where: { id: Number(id), user: { id: Number(userId) } } });
  }

  countUnreadForUser(userId: string): Promise<number> {
    return this.repository.count({ where: { user: { id: Number(userId) }, is_read: false } });
  }

  async markRead(id: string): Promise<void> {
    await this.repository.update({ id: Number(id) }, { is_read: true, read_at: new Date() });
  }

  async markAllReadForUser(userId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ is_read: true, read_at: new Date() })
      .where('user_id = :userId AND is_read = false', { userId })
      .execute();
  }
}
