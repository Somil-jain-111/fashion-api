import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';
import { NotificationEventType } from '../enum/notification-event-type.enum';
import { NotificationChannel } from '../enum/notification-channel.enum';

@Injectable()
export class NotificationPreferenceRepository extends BaseRepository<NotificationPreferenceEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(NotificationPreferenceEntity));
  }

  findOneForUser(userId: string, eventType: NotificationEventType, channel: NotificationChannel) {
    return this.repository.findOne({
      where: { user: { id: Number(userId) }, event_type: eventType, channel },
    });
  }

  findAllForUser(userId: string) {
    return this.repository.find({ where: { user: { id: Number(userId) } } });
  }

  async upsert(
    userId: string,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<NotificationPreferenceEntity> {
    const existing = await this.findOneForUser(userId, eventType, channel);
    if (existing) {
      existing.enabled = enabled;
      return this.repository.save(existing);
    }
    return this.repository.save(
      this.repository.create({
        user: { id: Number(userId) } as any,
        event_type: eventType,
        channel,
        enabled,
      })
    );
  }
}
