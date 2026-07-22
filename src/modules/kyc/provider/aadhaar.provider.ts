// src/modules/kyc/provider/aadhaar.provider.ts

import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { KycHmacHelper } from 'src/default/common/helper/kyc-hmac.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';

import { ApiResponseRepository } from 'src/modules/kyc/repository';

type GenerateAadhaarOtpInput = {
  aadhaarNumber: string;
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

type VerifyAadhaarOtpInput = {
  referenceId: string;
  otp: string;
  referenceIdOtp?: string;
};

@Injectable()
export class AadhaarProvider {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  async generateOtp(data: GenerateAadhaarOtpInput): Promise<KycProviderResult> {
    const payload = {
      type: 'kyc_adhaar_otp_send',
      id_number: data.aadhaarNumber,
      transaction_id: data.transactionId,
    };

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
      type: 'AADHAAR',
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
        message: response.data?.message || 'Aadhaar OTP generated successfully',
      };
    } catch (error) {
      const errorData = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      const statusCode = errorData?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('AADHAAR_OTP_PROVIDER_ERROR', error?.stack, {
        tag: 'AadhaarProvider.generateOtp',
        data: {
          transactionId: data.transactionId,
          statusCode,
          errorData,
        },
      });

      await this.apiResponseRepository.updateResponseByTransactionId(data.transactionId, errorData);

      return {
        success: false,
        requestConfig,
        requestPayload: payload,
        responseData: errorData,
        statusCode,
        message: errorData.message || 'Aadhaar OTP generation failed',
      };
    }
  }
  async verifyOtp(data: VerifyAadhaarOtpInput): Promise<KycProviderResult> {
    const payload = {
      type: 'kyc_adhaar_otp_verify',
      id_number: data.referenceIdOtp,
      transaction_id: data.referenceId,
      otp: data.otp,
    };

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
      type: 'AADHAAR',
      transactionId: data.referenceId,
      requestUrl: requestConfig.url || '',
      requestPayload: {
        payload,
        headers: requestConfig.headers,
      },
    });

    try {
      const response = await axios.request(requestConfig);

      await this.apiResponseRepository.updateResponseByTransactionId(
        data.referenceId,
        response.data
      );

      return {
        success: Boolean(response.data?.status),
        requestConfig,
        requestPayload: payload,
        responseData: response.data,
        statusCode: response.status,
        message: response.data?.message || 'Aadhaar verified successfully',
      };
    } catch (error) {
      const errorData = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      const statusCode = errorData?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('AADHAAR_OTP_VERIFY_PROVIDER_ERROR', error?.stack, {
        tag: 'AadhaarProvider.verifyOtp',
        data: {
          referenceId: data.referenceId,
          statusCode,
          errorData,
        },
      });

      await this.apiResponseRepository.updateResponseByTransactionId(data.referenceId, errorData);

      return {
        success: false,
        requestConfig,
        requestPayload: payload,
        responseData: errorData,
        statusCode,
        message: errorData.message || 'Aadhaar verification failed',
      };
    }
  }
}
