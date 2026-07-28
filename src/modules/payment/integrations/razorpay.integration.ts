import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

export type RazorpayPaymentLink = {
  id: string;
  short_url: string;
  status: string;
};

@Injectable()
export class RazorpayIntegration {
  private readonly client: AxiosInstance;

  constructor(private readonly config: AppConfigService) {
    this.client = axios.create({
      baseURL: this.config.get('RAZORPAY_API_URL', 'https://api.razorpay.com/v1'),
      timeout: Number(this.config.get('RAZORPAY_TIMEOUT_MS', 10_000)),
    });
  }

  async createPaymentLink(input: {
    amountPaise: number;
    referenceId: string;
    description: string;
    callbackUrl: string;
    customer: { name: string; contact: string; email: string };
    notes: Record<string, string>;
  }): Promise<RazorpayPaymentLink> {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new BusinessException(ERROR_CODES.PAYMENT.RAZORPAY_CONFIGURATION_MISSING);
    }
    try {
      const { data } = await this.client.post<RazorpayPaymentLink>(
        '/payment_links',
        {
          amount: input.amountPaise,
          currency: 'INR',
          accept_partial: false,
          description: input.description,
          reference_id: input.referenceId,
          expire_by: Math.floor(Date.now() / 1000) + 15 * 60,
          customer: input.customer,
          notify: { sms: false, email: false },
          notes: input.notes,
          callback_url: input.callbackUrl,
          callback_method: 'get',
        },
        { auth: { username: keyId, password: keySecret } }
      );
      return data;
    } catch (error) {
      throw new BusinessException(ERROR_CODES.PAYMENT.PAYMENT_LINK_CREATION_FAILED);
    }
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret || !signature || !rawBody?.length) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const received = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  }
}
