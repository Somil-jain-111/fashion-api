import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { KycHmacHelper } from 'src/default/common/helper/kyc-hmac.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { ApiResponseRepository } from '../repository';
import { shouldMockKycProvider } from './dev-mock.util';

type NameMatchInput = {
  userName: string;
  apiUserName: string;
  transactionId: string;
};

type KycProviderResult = {
  success: boolean;
  requestConfig: AxiosRequestConfig;
  requestPayload: Record<string, any>;
  responseData: any;
  statusCode: number;
  message: string;
};

@Injectable()
export class NameMatchProvider {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  async matchName(data: NameMatchInput): Promise<KycProviderResult> {
    const payload = {
      type: 'name_match',
      transaction_id: data.transactionId,
      name_1: data.userName,
      name_2: data.apiUserName,
    };

    if (shouldMockKycProvider(this.appConfigService)) {
      const responseData = {
        status: true,
        message: 'Name matching successful (dev mock)',
        data: { match_score: 100 },
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
      type: 'NAME_MATCH',
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
        message: response.data?.message || 'Name matching successful',
      };
    } catch (error) {
      const errorResponse = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      const statusCode = errorResponse?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('NAME_MATCH_PROVIDER_ERROR', error?.stack, {
        tag: 'NameMatchProvider.matchName',
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
        message: errorResponse.message || 'Name matching failed',
      };
    }
  }
}
