// src/modules/kyc/provider/name-match.provider.ts

import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { KycHmacHelper } from 'src/default/common/helper/kyc-hmac.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { ConsoleLogger } from 'src/default/logger/console/console.service';

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
  constructor(private readonly configService: AppConfigService) {}

  async matchName(data: NameMatchInput): Promise<KycProviderResult> {
    const payload = {
      type: 'name_match',
      transaction_id: data.transactionId,
      name_1: data.userName,
      name_2: data.apiUserName,
    };

    // const isLive = this.configService.isProduction();
    const isLive = true;

    const baseUrl = isLive
      ? this.configService.get('Rewards_API_Base_Url_Live')
      : this.configService.get('Rewards_API_Base_Url_Dev');

    const permanentToken = isLive
      ? this.configService.get('Rewards_API_Permanent_Token_Live')
      : this.configService.get('Rewards_API_Permanent_Token_Dev');

    const secretKey = this.configService.get('KYC_SECRET_KEY');

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

    try {
      const response = await axios.request(requestConfig);

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
        data: {
          transactionId: data.transactionId,
          statusCode,
          errorResponse,
        },
      });

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
