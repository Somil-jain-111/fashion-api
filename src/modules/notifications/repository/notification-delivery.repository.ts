import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { NotificationDeliveryEntity } from '../entities/notification-delivery.entity';
import { NotificationChannel, NotificationDeliveryStatus } from '../enum/notification-channel.enum';

@Injectable()
export class NotificationDeliveryRepository extends BaseRepository<NotificationDeliveryEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(NotificationDeliveryEntity));
  }

  createDelivery(
    notificationId: string,
    channel: NotificationChannel,
    status: NotificationDeliveryStatus
  ) {
    return this.repository.save(
      this.repository.create({
        notification: { id: notificationId } as any,
        channel,
        status,
        attempts: status === NotificationDeliveryStatus.PENDING ? 0 : 1,
        sent_at: status === NotificationDeliveryStatus.SENT ? new Date() : undefined,
      })
    );
  }

  async markResult(
    id: string,
    status: NotificationDeliveryStatus,
    error?: string
  ): Promise<void> {
    await this.repository.increment({ id: Number(id) } as any, 'attempts', 1);
    await this.repository.update(
      { id: Number(id) } as any,
      {
        status,
        last_error: error ?? undefined,
        sent_at: status === NotificationDeliveryStatus.SENT ? new Date() : undefined,
      }
    );
  }
}
