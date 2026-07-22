import { Injectable } from '@nestjs/common';
import { ProductProvider } from './provider/products.provider';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { ERROR_CODES } from 'src/default/error/error.code';
import { BusinessException } from 'src/default/error/business.exception';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { GetProductQueryDTO } from './interfaces/fetch-catalogue-products.input';
import { GetProductResponseDTO } from './dto/product-response.dto';
import axios, { AxiosRequestConfig } from 'axios';
import { AppConfigService } from 'src/default/config/config.service';
import { ApiResponseRepository } from '../kyc/repository';
import { CommonUtils } from 'src/default/common/utils/common.utils';

@Injectable()
export class RewardsService {
  constructor(
    private readonly productProvider: ProductProvider,
    private userAuthValidator: UserAuthValidator,
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  async getAllProducts(
    userId: number,
    filters: GetProductQueryDTO
  ): Promise<{ product: GetProductResponseDTO[]; pagination: Record<string, any> }> {
    const tag = 'RedemptionService.getAllProducts';

    const page = filters.page || 1;
    const limit = filters.limit || 10;

    ConsoleLogger.log('FETCH_PRODUCTS_START', {
      tag,
      data: { userId, page, limit, filters },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    const providerResult = await this.productProvider.fetchCatalogueProducts(filters);

    if (!providerResult.success) {
      ConsoleLogger.error('FETCH_PRODUCTS_PROVIDER_FAILED', undefined, {
        tag,
        data: {
          userId,
          statusCode: providerResult.statusCode,
          responseData: providerResult.responseData,
        },
      });

      throw new BusinessException(ERROR_CODES.REWARDS.CATALOGUE_FETCH_FAILED);
    }

    const rewardResponse = providerResult.responseData;

    const products = rewardResponse?.data?.[0]?.products ?? [];

    const totalItems = rewardResponse?.count?.count ?? rewardResponse?.count ?? products.length;

    const totalPages = Math.ceil(totalItems / limit);

    const transformedRows = products.map((prod) => {
      const d = prod.productDetails || {};

      let productName = d.name || d.brand_name || '';

      if (d.specification === 'DIGITAL') {
        productName = `${productName} - ${prod.mrp || ''}`;
      }

      return new GetProductResponseDTO(
        prod.projectProduct_id,
        prod.product_id || '',
        d.specification || '',
        d.brand_name || '',
        productName,
        d.sku || '',
        '',
        '',
        '',
        prod.mrp?.toString() || '',
        prod.cost?.toString() || '',
        prod.discount?.toString() || '',
        prod.price_points?.toString() || '',
        '',
        '',
        '1',
        prod.status ? 'Active' : 'Inactive',
        d.main_image || '',
        d.short_description || '',
        d.long_description || '',
        d.createdAt || '',
        d.updatedAt || ''
      );
    });

    ConsoleLogger.log('FETCH_PRODUCTS_SUCCESS', {
      tag,
      data: {
        userId,
        totalItems,
        totalPages,
        page,
        limit,
      },
    });

    return {
      product: transformedRows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async getCatalogueCategories(userId: number) {
    const tag = 'RedemptionService.getCatalogueCategories';

    ConsoleLogger.log('FETCH_CATALOGUE_CATEGORIES_START', {
      tag,
      data: { userId },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    const providerResult = await this.productProvider.fetchCatalogueCategories();

    if (!providerResult.success) {
      ConsoleLogger.error('FETCH_CATALOGUE_CATEGORIES_PROVIDER_FAILED', undefined, {
        tag,
        data: {
          userId,
          statusCode: providerResult.statusCode,
          responseData: providerResult.responseData,
        },
      });

      throw new BusinessException(ERROR_CODES.REWARDS.CATALOGUE_CATEGORY_FETCH_FAILED);
    }

    const rewardResponse = providerResult.responseData;

    ConsoleLogger.log('FETCH_CATALOGUE_CATEGORIES_SUCCESS', {
      tag,
      data: { userId },
    });

    return rewardResponse;
  }

  async payoutAmountBank(data: {
    type: string;
    name: string;
    number: string;
    account_number: string;
    ifsc: string;
    transactionId: string;
    userId: bigint | number;
    amount: number;
  }): Promise<any> {
    const tag = 'RewardsService.payoutAmountBank';

    const sku = this.appConfigService.getBankPayoutSku();

    const hmacInput = {
      type: data.type,
      name: data.name,
      email: 'almond@gmail.com',
      number: String(data.number),
      accountNumber: data.account_number,
      ifscCode: data.ifsc,
      amount: String(data.amount),
      transaction_id: data.transactionId,
      sku: sku,
    };

    const baseUrl = this.appConfigService.getRewardsUrl();
    const secretKey = this.appConfigService.getKycSecretKey();
    const permanentToken = this.appConfigService.getRewardsPermanentToken();

    if (!secretKey) {
      throw new BusinessException(ERROR_CODES.KYC.KYC_SECRET_KEY_MISSING);
    }

    const hmac = await CommonUtils.generateSecretKey(hmacInput);

    const payload = {
      type: hmacInput.type,
      name: hmacInput.name,
      email: hmacInput.email,
      msisdn: hmacInput.number,
      accountNumber: hmacInput.accountNumber,
      bankIfsc: hmacInput.ifscCode,
      amount: hmacInput.amount,
      transaction_id: hmacInput.transaction_id,
      sku: hmacInput.sku,
    };

    const requestConfig: AxiosRequestConfig = {
      method: 'post',
      url: `${baseUrl}/gratification`,
      headers: {
        'x-hmac': hmac,
        permanent_token: permanentToken,
        'content-type': 'application/json',
      },
      data: payload,
    };

    ConsoleLogger.log('PAYOUT_AMOUNT_BANK_REQUEST', {
      tag,
      data: {
        userId: String(data.userId),
        url: requestConfig.url,
        payload,
      },
    });

    try {
      const response = await axios.request(requestConfig);

      await this.apiResponseRepository.saveResponse({
        type: 'BANK_PAYOUT',
        requestUrl: requestConfig.url || '',
        requestPayload: {
          payload,
          headers: requestConfig.headers,
        },
        responsePayload: response.data,
      });

      return response.data;
    } catch (error) {
      console.log(error);
      const errorData = error.response?.data || {
        status: false,
        message: error.message || 'Unknown error',
      };

      const statusCode = errorData?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('PAYOUT_AMOUNT_BANK_ERROR', error?.stack, {
        tag,
        data: {
          userId: String(data.userId),
          statusCode,
          errorData,
          message: error?.message,
        },
      });

      await this.apiResponseRepository.saveResponse({
        type: 'BANK_PAYOUT_FAILED',
        requestUrl: requestConfig.url || '',
        requestPayload: requestConfig,
        responsePayload: { ...errorData, responseMessage: error?.message },
      });

      throw new BusinessException(ERROR_CODES.PAYMENT.PAYMENT_FAILED);
    }
  }
}
