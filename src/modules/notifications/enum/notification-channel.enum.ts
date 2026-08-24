export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
}

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  /**
   * The channel's provider isn't configured (e.g. no Firebase credentials yet) — a known,
   * expected non-error state, distinct from FAILED so it never triggers BullMQ retries.
   */
  SKIPPED = 'SKIPPED',
}

export enum DevicePlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  WEB = 'WEB',
}
