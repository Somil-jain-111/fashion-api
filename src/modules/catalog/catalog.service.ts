import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { UserStatus } from '../auth/constants/auth.constants';
import { ProductRepository } from '../products/repository';
import { Product } from '../products/entities';
import { CategoryRepository } from '../categories/repository';
import { CategoriesService } from '../categories/categories.service';
import { UserRepository } from '../auth/repository';
import { KycVerificationEntity } from '../seller-kyc/entities';
import { SellerKycService } from '../seller-kyc/seller-kyc.service';
import { CatalogProductsQueryDto, CatalogSortBy } from './dto/catalog-products-query.dto';

const REQUIRED_KYC_TYPES = [KycType.PAN, KycType.GST, KycType.AADHAAR];

@Injectable()
export class CatalogService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly categoriesService: CategoriesService,
    private readonly userRepository: UserRepository,
    private readonly sellerKycService: SellerKycService
  ) {}

  /**
   * Baseline visibility every catalog query must apply, regardless of which
   * optional filters are present: approved + not deleted (product.andWhere below),
   * seller active, and seller fully KYC-verified (PAN+GST+AADHAAR all VERIFIED).
   */
  private applyVisibilityRules(qb: SelectQueryBuilder<Product>): SelectQueryBuilder<Product> {
    qb.innerJoinAndSelect('product.seller', 'seller')
      .where('product.status = :approvedStatus', { approvedStatus: ProductStatus.APPROVED })
      .andWhere('seller.status = :activeStatus', { activeStatus: UserStatus.ACTIVE });

    qb.andWhere((subQb) => {
      const sub = subQb
        .subQuery()
        .select('1')
        .from(KycVerificationEntity, 'kv')
        .where('kv.user_id = seller.id')
        .andWhere('kv.status = :verifiedStatus')
        .andWhere('kv.type IN (:...requiredTypes)')
        .groupBy('kv.user_id')
        .having('COUNT(DISTINCT kv.type) = :requiredCount')
        .getQuery();

      return `EXISTS ${sub}`;
    })
      .setParameter('verifiedStatus', KycStatus.VERIFIED)
      .setParameter('requiredTypes', REQUIRED_KYC_TYPES)
      .setParameter('requiredCount', REQUIRED_KYC_TYPES.length);

    return qb;
  }

  private async applyFilters(
    qb: SelectQueryBuilder<Product>,
    query: CatalogProductsQueryDto
  ): Promise<void> {
    if (query.q) {
      qb.andWhere('MATCH(product.name, product.description) AGAINST (:q IN NATURAL LANGUAGE MODE)', {
        q: query.q,
      });
    }

    if (query.categoryId) {
      const descendantIds = await this.categoryRepository.findDescendantIds(query.categoryId);
      qb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds: descendantIds });
    }

    if (query.sellerId) {
      qb.andWhere('product.sellerId = :sellerId', { sellerId: query.sellerId });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('product.basePrice >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.basePrice <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.minRating !== undefined) {
      qb.andWhere('product.ratingAverage >= :minRating', { minRating: query.minRating });
    }

    if (query.zone) {
      qb.andWhere('product.zone = :zone', { zone: query.zone });
    }

    // `size` implies "in stock for that size" unless the caller explicitly asks
    // for out-of-stock too via inStock=false.
    if (query.size) {
      qb.innerJoin('product.variants', 'sizeVariant', 'sizeVariant.size = :size', {
        size: query.size,
      });

      if (query.inStock !== false) {
        qb.andWhere('sizeVariant.stockQuantity > 0');
      }
    } else if (query.inStock !== undefined) {
      if (query.inStock) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = product.id AND pv.stock_quantity > 0 AND pv.deleted_at IS NULL)'
        );
      } else {
        qb.andWhere(
          'NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = product.id AND pv.stock_quantity > 0 AND pv.deleted_at IS NULL)'
        );
      }
    }
  }

  private applySort(qb: SelectQueryBuilder<Product>, sortBy?: CatalogSortBy): void {
    switch (sortBy) {
      case CatalogSortBy.PRICE_ASC:
        qb.orderBy('product.basePrice', 'ASC');
        break;
      case CatalogSortBy.PRICE_DESC:
        qb.orderBy('product.basePrice', 'DESC');
        break;
      case CatalogSortBy.RATING:
        qb.orderBy('product.ratingAverage', 'DESC');
        break;
      case CatalogSortBy.POPULARITY:
        qb.orderBy('product.ratingCount', 'DESC');
        break;
      case CatalogSortBy.NEWEST:
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }
  }

  private summarize(product: Product) {
    const images = product.images ?? [];
    const primaryImage = images.find((img) => img.isPrimary) ?? images[0];

    return {
      id: product.id,
      name: product.name,
      basePrice: product.basePrice,
      wholesalePrice: product.wholesalePrice,
      mrp: product.mrp,
      discountPercentage: product.discountPercentage,
      currentPrice: product.currentPrice,
      zone: product.zone,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
      variants: (product.variants ?? []).map((v) => ({
        size: v.size,
        price: v.priceOverride ?? product.basePrice,
        inStock: v.stockQuantity > 0,
      })),
      primaryImageUrl: primaryImage?.url ?? null,
      seller: product.seller
        ? {
            id: product.seller.id,
            businessName: product.seller.firmName ?? null,
            ratingAverage: product.seller.ratingAverage,
          }
        : null,
    };
  }

  async listProducts(query: CatalogProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.variants', 'variants');

    qb = this.applyVisibilityRules(qb);
    await this.applyFilters(qb, query);
    this.applySort(qb, query.sortBy);

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((p) => this.summarize(p)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductDetail(id: number) {
    let qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.variants', 'variants')
      .andWhere('product.id = :id', { id });

    qb = this.applyVisibilityRules(qb);

    const product = await qb.getOne();

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    const breadcrumb = await this.categoryRepository.findAncestorChain(product.categoryId);

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      wholesalePrice: product.wholesalePrice,
      mrp: product.mrp,
      discountPercentage: product.discountPercentage,
      currentPrice: product.currentPrice,
      zone: product.zone,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      category: product.category,
      categoryBreadcrumb: breadcrumb.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      variants: product.variants ?? [],
      images: product.images ?? [],
      seller: product.seller
        ? {
            id: product.seller.id,
            businessName: product.seller.firmName ?? null,
            ratingAverage: product.seller.ratingAverage,
          }
        : null,
    };
  }

  async getCategories(flat: boolean) {
    return await this.categoriesService.getTree(flat);
  }

  async getSellerProfile(sellerId: number) {
    const seller = await this.userRepository.findById(sellerId);
    const isKycApproved = await this.sellerKycService.isSellerKycApproved(sellerId);

    if (!seller || seller.status !== UserStatus.ACTIVE || !isKycApproved) {
      throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);
    }

    let qb = this.productRepository.createQueryBuilder('product');
    qb = this.applyVisibilityRules(qb);
    qb.andWhere('product.sellerId = :sellerId', { sellerId });

    const productCount = await qb.getCount();

    return {
      id: seller.id,
      businessName: seller.firmName ?? null,
      ratingAverage: seller.ratingAverage,
      productCount,
      joinedAt: seller.createdAt,
    };
  }
}
