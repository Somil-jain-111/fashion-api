import { Injectable } from '@nestjs/common';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { AppConfigService } from 'src/default/config/config.service';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { PushProvider, PushSendResult } from './push-provider.interface';

/**
 * Real firebase-admin integration, gated behind the presence of the 3 standard
 * service-account env vars. Until they're set, every send() call returns `skipped: true`
 * (logged once per process, not per call) rather than throwing — a missing credential is an
 * expected "not configured yet" state, not a delivery failure.
 */
@Injectable()
export class FirebasePushProvider implements PushProvider {
  private app: App | null | undefined; // undefined = not yet checked, null = not configured
  private warnedNotConfigured = false;

  constructor(private readonly config: AppConfigService) {}

  private getApp(): App | null {
    if (this.app !== undefined) {
      return this.app;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.app = null;
      return null;
    }

    this.app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        // Env vars typically escape newlines as literal "\n" — restore them.
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    return this.app;
  }

  async send(
    deviceTokens: string[],
    title: string,
    body: string,
    data: Record<string, unknown>
  ): Promise<PushSendResult> {
    const app = this.getApp();

    if (!app) {
      if (!this.warnedNotConfigured) {
        ConsoleLogger.log(
          'Firebase not configured (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY missing) — PUSH notifications will be skipped until credentials are set.',
          'FirebasePushProvider'
        );
        this.warnedNotConfigured = true;
      }
      return { sent: false, skipped: true };
    }

    if (!deviceTokens.length) {
      return { sent: false, skipped: true, error: 'No registered device tokens for this user' };
    }

    try {
      const stringData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
      );

      const result = await getMessaging(app).sendEachForMulticast({
        tokens: deviceTokens,
        notification: { title, body },
        data: stringData,
      });

      if (result.failureCount > 0 && result.successCount === 0) {
        const firstError = result.responses.find((r) => !r.success)?.error?.message;
        return { sent: false, skipped: false, error: firstError || 'All sends failed' };
      }

      return { sent: true, skipped: false };
    } catch (error) {
      return { sent: false, skipped: false, error: error?.message || String(error) };
    }
  }
}
