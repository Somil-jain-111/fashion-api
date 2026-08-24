import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { NotificationTemplateEntity } from '../entities/notification-template.entity';
import { NotificationEventType } from '../enum/notification-event-type.enum';

@Injectable()
export class NotificationTemplateRepository extends BaseRepository<NotificationTemplateEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(NotificationTemplateEntity));
  }

  findByEventType(eventType: NotificationEventType) {
    return this.repository.findOne({ where: { event_type: eventType, active: true } });
  }

  async findAllPaginated(
    page: number,
    limit: number
  ): Promise<{ items: NotificationTemplateEntity[]; total: number }> {
    const [items, total] = await this.repository
      .createQueryBuilder('template')
      .orderBy('template.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}
