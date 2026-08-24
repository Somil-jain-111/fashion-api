export interface PushSendResult {
  sent: boolean;
  /** True when the provider isn't configured — a known, expected state, not a failure. */
  skipped: boolean;
  error?: string;
}

export interface PushProvider {
  send(
    deviceTokens: string[],
    title: string,
    body: string,
    data: Record<string, unknown>
  ): Promise<PushSendResult>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
