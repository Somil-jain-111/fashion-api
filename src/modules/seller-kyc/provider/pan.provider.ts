import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { KycHmacHelper } from 'src/default/common/helper/kyc-hmac.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { ApiResponseRepository } from '../repository';
import { shouldMockKycProvider } from './dev-mock.util';

type PanVerifyInput = {
  panCard: string;
  transactionId: string;
};

export type PanVerifyResult = {
  success: boolean;
  requestConfig: AxiosRequestConfig;
  requestPayload: Record<string, any>;
  responseData: any;
  statusCode: number;
  message: string;
};

@Injectable()
export class PanProvider {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  maskPanNumber(pan: string): string {
    const cleanedPan = pan.replace(/\s+/g, '').toUpperCase();

    if (cleanedPan.length !== 10) {
      throw new Error('Invalid PAN number length');
    }

    return 'XXXXXX' + cleanedPan.slice(6);
  }

  async verifyPan(data: PanVerifyInput): Promise<PanVerifyResult> {
    const pan = data.panCard.toUpperCase();

    const payload = {
      type: 'kyc_pan',
      id_number: pan,
      transaction_id: data.transactionId,
    };

    if (shouldMockKycProvider(this.appConfigService)) {
      const responseData = {
        status: true,
        message: 'PAN verification successful (dev mock)',
        data: { full_name: 'Dev Mock User', aadhaar_linked: 'successful' },
      };

      return {
        success: true,
        requestConfig: { method: 'post', url: 'DEV_MOCK', headers: {}, data: payload },
        requestPayload: payload,
        responseData,
        statusCode: 200,
        message: responseData.message,
      };
    }

    const baseUrl = this.appConfigService.getRewardsUrl();
    const secretKey = this.appConfigService.getKycSecretKey();
    const permanentToken = this.appConfigService.getRewardsPermanentToken();

    if (!secretKey) {
      throw new BusinessException(ERROR_CODES.KYC.KYC_SECRET_KEY_MISSING);
    }

    const requestConfig: AxiosRequestConfig = {
      method: 'post',
      url: `${baseUrl}/gratification/kyc`,
      headers: {
        'x-hmac': KycHmacHelper.generateSecretKey({ result: payload }, secretKey),
        permanent_token: permanentToken,
        'content-type': 'application/json',
      },
      data: payload,
    };

    await this.apiResponseRepository.saveResponse({
      type: 'PAN',
      transactionId: data.transactionId,
      requestUrl: requestConfig.url || '',
      requestPayload: {
        payload,
        headers: requestConfig.headers,
      },
    });

    try {
      const response = await axios.request(requestConfig);

      await this.apiResponseRepository.updateResponseByTransactionId(
        data.transactionId,
        response.data
      );

      return {
        success: Boolean(response.data?.status),
        requestConfig,
        requestPayload: payload,
        responseData: response.data,
        statusCode: response.status,
        message: response.data?.message || 'PAN verification successful',
      };
    } catch (error) {
      const errorResponse = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      const statusCode = errorResponse?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('PAN_PROVIDER_ERROR', error?.stack, {
        tag: 'PanProvider.verifyPan',
        data: { transactionId: data.transactionId, statusCode },
      });

      await this.apiResponseRepository.updateResponseByTransactionId(
        data.transactionId,
        errorResponse
      );

      return {
        success: false,
        requestConfig,
        requestPayload: payload,
        responseData: errorResponse,
        statusCode,
        message: errorResponse.message || 'PAN verification failed',
      };
    }
  }
}
