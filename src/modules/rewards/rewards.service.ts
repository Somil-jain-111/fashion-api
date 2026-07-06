import { Injectable } from '@nestjs/common';
import { ProductProvider } from './provider/products.provider';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { ERROR_CODES } from 'src/default/error/error.code';
import { BusinessException } from 'src/default/error/business.exception';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { GetProductQueryDTO } from './interfaces/fetch-catalogue-products.input';
import { GetProductResponseDTO } from './dto/product-response.dto';

@Injectable()
export class RewardsService {
  constructor(
    private readonly productProvider: ProductProvider,
    private userAuthValidator: UserAuthValidator
  ) {}

  async getAllProducts(userId: number, filters: GetProductQueryDTO) {
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
}
