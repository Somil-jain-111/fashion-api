import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { KycHmacHelper } from 'src/default/common/helper/kyc-hmac.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { ApiResponseRepository } from 'src/modules/kyc/repository';

export type BankVerifyInput = {
  accountNumber: string;
  ifsc: string;
  transactionId: string;
};

export type BankVerifyResult = {
  success: boolean;
  requestConfig: AxiosRequestConfig;
  requestPayload: Record<string, any>;
  responseData: any;
  statusCode: number;
  message: string;
};

@Injectable()
export class BankProvider {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  async validateBankAccount(data: BankVerifyInput): Promise<BankVerifyResult> {
    const payload = {
      type: 'kyc_bank',
      id_number: data.accountNumber,
      ifsc_code: data.ifsc,
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
      type: 'BANK',
      transactionId: data.transactionId,
      requestUrl: requestConfig.url || '',
      requestPayload: {
        payload,
        headers: requestConfig.headers,
      },
    });

    try {
      ConsoleLogger.log(`Calling Bank verification | transactionId: ${data.transactionId}`, {
        tag: 'BankProvider.validateBankAccount',
        data: payload,
      });

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
        message: response.data?.message || 'Bank verification successful',
      };
    } catch (error: any) {
      const responseData = error.response?.data || { status: false, message: 'Bank API failed' };
      const statusCode = responseData?.data?.statuscode || error.response?.status || 500;

      ConsoleLogger.error(
        `Error Bank verification | transactionId: ${data.transactionId}`,
        error.stack,
        'BankProvider.validateBankAccount'
      );

      await this.apiResponseRepository.updateResponseByTransactionId(
        data.transactionId,
        responseData
      );

      return {
        success: false,
        requestConfig,
        requestPayload: payload,
        responseData,
        statusCode,
        message: responseData?.message || error.message || 'Bank verification failed',
      };
    }
  }
}
