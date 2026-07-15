import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

import { GetProductQueryDTO } from '../interfaces/fetch-catalogue-products.input';
import { ProductProviderResult } from '../interfaces/product-provider-result.interface';
import { AppConfigService } from 'src/default/config/config.service';
import { ApiResponseRepository } from 'src/modules/kyc/repository';

@Injectable()
export class ProductProvider {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly apiResponseRepository: ApiResponseRepository
  ) {}

  private getRewardsApiConfig() {
    const baseUrl = this.appConfigService.getRewardsUrl();
    const catalogueId = this.appConfigService.getRewardsProductsCatalogueId();
    const permanentToken = this.appConfigService.getRewardsPermanentToken();

    if (!baseUrl) {
      throw new BusinessException(ERROR_CODES.REWARDS.REWARDS_BASE_URL_MISSING);
    }

    if (!catalogueId) {
      throw new BusinessException(ERROR_CODES.REWARDS.CATALOGUE_ID_MISSING);
    }

    if (!permanentToken) {
      throw new BusinessException(ERROR_CODES.REWARDS.PERMANENT_TOKEN_MISSING);
    }

    return {
      baseUrl,
      catalogueId,
      permanentToken,
    };
  }

  async fetchCatalogueProducts(data: GetProductQueryDTO): Promise<ProductProviderResult> {
    const { page, limit, categoryId, sortBy, name, projectProductId, type } = data;

    const { baseUrl, catalogueId, permanentToken } = this.getRewardsApiConfig();

    const params = {
      page,
      limit,
      catalogue_id: catalogueId,
      category_id: categoryId,
      sort_by: sortBy,
      search: name,
      projectProduct_id: projectProductId,
      status: true,
      type: type,
    };

    const requestConfig: AxiosRequestConfig = {
      method: 'get',
      url: `${baseUrl}/catalogue/projectWiseCatalogueProducts`,
      params,
      headers: {
        permanent_token: permanentToken,
        'content-type': 'application/json',
      },
    };

    ConsoleLogger.log('CATALOGUE_PRODUCTS_PROVIDER_REQUEST', {
      tag: 'ProductProvider.fetchCatalogueProducts',
      data: {
        page,
        limit,
        params,
      },
    });

    try {
      const response = await axios.request(requestConfig);

      return {
        success: Boolean(response.data?.status),
        requestConfig,
        requestPayload: params,
        responseData: response.data,
        statusCode: response.status,
        message: response.data?.message || 'Catalogue products fetched successfully',
      };
    } catch (error) {
      const errorData = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      const statusCode = errorData?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('CATALOGUE_PRODUCTS_PROVIDER_ERROR', error?.stack, {
        tag: 'ProductProvider.fetchCatalogueProducts',
        data: {
          statusCode,
          errorData,
          message: error?.message,
        },
      });

      await this.apiResponseRepository.saveResponse({
        type: 'rewards_products',
        requestUrl: requestConfig.url,
        requestPayload: requestConfig,
        responsePayload: { ...errorData, responseMessage: error?.message },
      });

      return {
        success: false,
        requestConfig,
        requestPayload: params,
        responseData: errorData,
        statusCode,
        message: errorData.message || 'Catalogue products fetch failed',
      };
    }
  }

  async fetchCatalogueCategories(): Promise<ProductProviderResult> {
    const tag = 'ProductProvider.fetchCatalogueCategories';

    const { baseUrl, catalogueId, permanentToken } = this.getRewardsApiConfig();

    const params = {
      catalogue_id: catalogueId,
    };

    const requestConfig: AxiosRequestConfig = {
      method: 'get',
      url: `${baseUrl}/catalogue/categorywise/list`,
      params,
      headers: {
        permanent_token: permanentToken,
        'content-type': 'application/json',
      },
    };

    ConsoleLogger.log('CATALOGUE_CATEGORIES_PROVIDER_REQUEST', {
      tag,
      data: { params },
    });

    try {
      const response = await axios.request(requestConfig);

      return {
        success: Boolean(response.data?.status),
        requestConfig,
        requestPayload: params,
        responseData: response.data,
        statusCode: response.status,
        message: response.data?.message || 'Catalogue categories fetched successfully',
      };
    } catch (error) {
      const errorData = error.response?.data || {
        status: false,
        message: 'Unknown error',
      };

      const statusCode = errorData?.data?.statuscode || error.response?.status || 400;

      ConsoleLogger.error('CATALOGUE_CATEGORIES_PROVIDER_ERROR', error?.stack, {
        tag,
        data: {
          statusCode,
          errorData,
          message: error?.message,
        },
      });

      return {
        success: false,
        requestConfig,
        requestPayload: params,
        responseData: errorData,
        statusCode,
        message: errorData.message || 'Catalogue categories fetch failed',
      };
    }
  }
}
