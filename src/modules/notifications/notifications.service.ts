import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import {
  NotificationDeliveryRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationTemplateRepository,
  UserDeviceRepository,
} from './repository';
import { NotificationEventType } from './enum/notification-event-type.enum';
import { NotificationChannel, NotificationDeliveryStatus, DevicePlatform } from './enum/notification-channel.enum';
import { PushDispatchJobData } from './processors/notification-dispatch.processor';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly templates: NotificationTemplateRepository,
    private readonly preferences: NotificationPreferenceRepository,
    private readonly deliveries: NotificationDeliveryRepository,
    private readonly devices: UserDeviceRepository,
    @InjectQueue('notification-dispatch') private readonly dispatchQueue: Queue
  ) {}

  /**
   * Never throws to the caller on a missing template or a disabled preference — both are
   * legitimate "nothing to do" outcomes for a business flow that just completed and
   * shouldn't be blocked on notification plumbing.
   *
   * IN_APP is written synchronously (just a DB insert, no external call). PUSH is only
   * enqueued if enabled — the actual send happens in NotificationDispatchProcessor, the one
   * channel with real network/retry needs.
   */
  async notify(
    userId: string,
    eventType: NotificationEventType,
    templateData: Record<string, unknown> = {},
    reference?: { type: string; id: string }
  ): Promise<void> {
    try {
      const template = await this.templates.findByEventType(eventType);
      if (!template) {
        ConsoleLogger.error(
          'NOTIFICATION_TEMPLATE_MISSING',
          undefined,
          `NotificationsService.notify: no template for ${eventType}`
        );
        return;
      }

      const title = this.render(template.title, templateData);
      const body = this.render(template.body, templateData);

      const notification = await this.notifications.save({
        user: { id: Number(userId) } as any,
        event_type: eventType,
        title,
        body,
        reference_type: reference?.type,
        reference_id: reference?.id,
        metadata: templateData,
      });

      const inAppEnabled = await this.isChannelEnabled(userId, eventType, NotificationChannel.IN_APP);
      await this.deliveries.createDelivery(
        String(notification.id),
        NotificationChannel.IN_APP,
        inAppEnabled ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.SKIPPED
      );

      const pushEnabled = await this.isChannelEnabled(userId, eventType, NotificationChannel.PUSH);
      if (pushEnabled) {
        const pushDelivery = await this.deliveries.createDelivery(
          String(notification.id),
          NotificationChannel.PUSH,
          NotificationDeliveryStatus.PENDING
        );

        const jobData: PushDispatchJobData = {
          deliveryId: String(pushDelivery.id),
          userId,
          title,
          body,
          data: templateData,
        };
        await this.dispatchQueue.add('push', jobData, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        });
      } else {
        await this.deliveries.createDelivery(
          String(notification.id),
          NotificationChannel.PUSH,
          NotificationDeliveryStatus.SKIPPED
        );
      }
    } catch (error) {
      // A notification failure must never take down the business flow that triggered it.
      ConsoleLogger.error('NOTIFICATION_SEND_FAILED', error?.stack || error, {
        tag: 'NotificationsService.notify',
        data: { userId, eventType },
      });
    }
  }

  private async isChannelEnabled(
    userId: string,
    eventType: NotificationEventType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preference = await this.preferences.findOneForUser(userId, eventType, channel);
    return !preference || preference.enabled;
  }

  private render(text: string, data: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) =>
      data[key] !== undefined && data[key] !== null ? String(data[key]) : match
    );
  }

  async list(userId: string, page: number, limit: number, unreadOnly?: boolean) {
    const { items, total } = await this.notifications.listForUser(userId, page, limit, unreadOnly);
    return {
      items: items.map((item) => ({
        id: item.id,
        eventType: item.event_type,
        title: item.title,
        body: item.body,
        referenceType: item.reference_type ?? null,
        referenceId: item.reference_id ?? null,
        isRead: item.is_read,
        readAt: item.read_at ?? null,
        metadata: item.metadata ?? null,
        createdAt: item.createdAt,
      })),
      pagination: CommonUtils.generatePaginationResponse(total, page, limit),
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.notifications.findOwnedById(id, userId);
    if (!notification) {
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_NOT_FOUND);
    }
    if (notification.is_read) {
      throw new BusinessException(ERROR_CODES.NOTIFICATION.NOTIFICATION_ALREADY_READ);
    }
    await this.notifications.markRead(id);
    return { id, isRead: true };
  }

  async markAllRead(userId: string) {
    await this.notifications.markAllReadForUser(userId);
    return { message: 'All notifications marked as read' };
  }

  async unreadCount(userId: string) {
    const count = await this.notifications.countUnreadForUser(userId);
    return { count };
  }

  async getPreferences(userId: string) {
    const rows = await this.preferences.findAllForUser(userId);
    const byKey = new Map(rows.map((row) => [`${row.event_type}:${row.channel}`, row.enabled]));

    const preferences: { eventType: NotificationEventType; channel: NotificationChannel; enabled: boolean }[] = [];
    for (const eventType of Object.values(NotificationEventType)) {
      for (const channel of Object.values(NotificationChannel)) {
        const key = `${eventType}:${channel}`;
        preferences.push({
          eventType,
          channel,
          enabled: byKey.has(key) ? byKey.get(key)! : true,
        });
      }
    }

    return { preferences };
  }

  async updatePreference(
    userId: string,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    enabled: boolean
  ) {
    const row = await this.preferences.upsert(userId, eventType, channel, enabled);
    return { eventType: row.event_type, channel: row.channel, enabled: row.enabled };
  }

  async registerDevice(userId: string, deviceToken: string, platform: DevicePlatform) {
    const device = await this.devices.upsert(userId, deviceToken, platform);
    return { id: device.id, platform: device.platform };
  }

  async removeDevice(userId: string, deviceToken: string) {
    await this.devices.removeToken(userId, deviceToken);
    return { message: 'Device unregistered' };
  }
}
