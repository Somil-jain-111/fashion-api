import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { NotificationDeliveryRepository } from '../repository/notification-delivery.repository';
import { UserDeviceRepository } from '../repository/user-device.repository';
import { FirebasePushProvider } from '../providers/firebase-push.provider';
import { NotificationDeliveryStatus } from '../enum/notification-channel.enum';

export interface PushDispatchJobData {
  deliveryId: string;
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * Only PUSH goes through the queue — IN_APP is a plain DB insert with no external call, so it
 * stays synchronous in NotificationsService.notify() (queueing it would risk a duplicate
 * `notifications` row on BullMQ retry, since retries re-run the whole handler). PUSH is the
 * one channel with genuine network/latency risk, so it's the one that benefits from
 * retry/backoff — this processor only ever updates the single delivery row it was handed, so
 * retrying it is safe.
 */
@Processor('notification-dispatch')
export class NotificationDispatchProcessor extends WorkerHost {
  constructor(
    private readonly deliveries: NotificationDeliveryRepository,
    private readonly devices: UserDeviceRepository,
    private readonly pushProvider: FirebasePushProvider
  ) {
    super();
  }

  async process(job: Job<PushDispatchJobData>): Promise<void> {
    const { deliveryId, userId, title, body, data } = job.data;

    const devices = await this.devices.findTokensForUser(userId);
    const tokens = devices.map((device) => device.device_token);

    const result = await this.pushProvider.send(tokens, title, body, data);

    if (result.skipped) {
      await this.deliveries.markResult(deliveryId, NotificationDeliveryStatus.SKIPPED, result.error);
      ConsoleLogger.log(`Push skipped for delivery ${deliveryId}: ${result.error || 'not configured'}`, 'NotificationDispatchProcessor');
      return;
    }

    if (result.sent) {
      await this.deliveries.markResult(deliveryId, NotificationDeliveryStatus.SENT);
      return;
    }

    await this.deliveries.markResult(deliveryId, NotificationDeliveryStatus.FAILED, result.error);
    // Throwing lets BullMQ's configured attempts/backoff retry just this push send.
    throw new Error(result.error || 'Push send failed');
  }
}
