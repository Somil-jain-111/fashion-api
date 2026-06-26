// src/modules/redemptions/providers/order-place.provider.ts

import { Injectable, HttpStatus } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { QueryRunner } from 'typeorm';

import { AppConfigService } from 'src/default/config/config.service';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { ConsoleLogger } from 'src/default/logger/console/console.service';

export type OrderPlaceProviderInput = {
  userId: bigint | number | string;
  payload: Record<string, any>;
  queryRunner?: QueryRunner;
};

export type OrderPlaceProviderResult = {
  success: boolean;
  requestConfig: AxiosRequestConfig;
  requestPayload: Record<string, any>;
  responseData: any;
  statusCode: number;
  message: string;
};

@Injectable()
export class OrderPlaceProvider {
  constructor(private readonly configService: AppConfigService) {}

  async placeOrder(
    data: OrderPlaceProviderInput,
  ): Promise<OrderPlaceProviderResult> {
    const tag = 'OrderPlaceProvider.placeOrder';

    const endpoint = 'orders/orderPlaced';
    const type = 'orders/orderPlaced';

    const isLive =
      this.configService.get('NODE_ENV') === 'production' ||
      this.configService.get('NODE_ENV') === 'qa';

    const baseUrl = isLive
      ? this.configService.get('Rewards_API_Base_Url_Live')
      : this.configService.get('Rewards_API_Base_Url_Dev');

    const permanentToken = isLive
      ? this.configService.get('Rewards_API_Permanent_Token_Live')
      : this.configService.get('Rewards_API_Permanent_Token_Dev');

    const requestConfig: AxiosRequestConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${baseUrl}/${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'x-hmac': await CommonUtils.HmacKey(data.payload),
        permanent_token: permanentToken,
      },
      data: data.payload,
    };

    try {
      ConsoleLogger.log('ORDER_PLACE_PROVIDER_REQUEST', {
        tag,
        data: {
          userId: data.userId,
          url: requestConfig.url,
          payload: data.payload,
        },
      });

      const response = await axios.request(requestConfig);

      return {
        success: response?.data?.statusCode === 200 || response?.status === 200,
        requestConfig,
        requestPayload: data.payload,
        responseData: response?.data,
        statusCode: response?.data?.statusCode || response.status,
        message: response?.data?.message || 'Order placed successfully',
      };
    } catch (error) {
      const errorData = error.response?.data || {
        message: error.message || 'Unknown error',
      };

      const statusCode =
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;

      ConsoleLogger.error('ORDER_PLACE_PROVIDER_ERROR', error?.stack, {
        tag,
        data: {
          userId: data.userId,
          statusCode,
          errorData,
        },
      });
      return {
        success: false,
        requestConfig,
        requestPayload: data.payload,
        responseData: errorData,
        statusCode,
        message: errorData?.message || 'Order place provider failed',
      };
    }
  }
}