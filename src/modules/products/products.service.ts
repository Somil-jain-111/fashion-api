import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { assertOwnerOrAdmin } from 'src/default/common/helper/product-ownership.helper';
import { TransactionService } from 'src/default/databases/transaction';
import { CategoryRepository } from '../categories/repository';
import { SellerKycService } from '../seller-kyc/seller-kyc.service';
import { ProductRepository, ProductVariantRepository, ProductImageRepository } from './repository';
import { Product, ProductVariant } from './entities';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductImageDto } from './dto/product-image.dto';
import { AdminListProductsQueryDto } from './dto/admin-list-products-query.dto';

type RequestUser = { id: number; role: string[] };

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly sellerKycService: SellerKycService,
    private readonly transactionService: TransactionService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * currentPrice is always server-derived from mrp/discountPercentage, never
   * accepted directly from a request body. `undefined` mrp means "no MRP set" —
   * currentPrice stays null (product just uses basePrice/wholesalePrice, unchanged).
   */
  private computeCurrentPrice(mrp?: number | null, discountPercentage?: number | null): number | null {
    if (mrp === null || mrp === undefined) {
      return null;
    }

    const discount = discountPercentage ?? 0;
    return Math.round(mrp * (1 - discount / 100) * 100) / 100;
  }

  private async assertCategoryExists(categoryId: number): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new BusinessException(ERROR_CODES.CATEGORY.CATEGORY_NOT_FOUND);
    }
  }

  private async assertSkusAvailable(skus: string[], excludeProductId?: number): Promise<void> {
    for (const sku of skus) {
      const existing = await this.productVariantRepository.findBySku(sku);

      // Bigint columns come back from TypeORM as strings — normalize before comparing.
      if (existing && Number(existing.productId) !== Number(excludeProductId ?? NaN)) {
        throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_SKU_ALREADY_EXISTS, { sku });
      }
    }
  }

  private async createVariants(
    productId: number,
    variants: CreateProductDto['variants'],
    queryRunner: QueryRunner
  ): Promise<ProductVariant[]> {
    const created: ProductVariant[] = [];

    for (const variant of variants) {
      created.push(
        await this.productVariantRepository.save(
          {
            productId,
            size: variant.size,
            sku: variant.sku,
            priceOverride: variant.priceOverride ?? null,
            stockQuantity: variant.stockQuantity,
          },
          queryRunner
        )
      );
    }

    return created;
  }

  private async createImages(
    productId: number,
    images: ProductImageDto[],
    variants: ProductVariant[],
    queryRunner: QueryRunner
  ): Promise<void> {
    for (const image of images) {
      const variantId =
        image.variantIndex !== undefined ? (variants[image.variantIndex]?.id ?? null) : null;

      await this.productImageRepository.save(
        {
          productId,
          variantId,
          url: image.url,
          isPrimary: image.isPrimary ?? false,
          sortOrder: image.sortOrder ?? 0,
        },
        queryRunner
      );
    }
  }

  async create(sellerId: number, dto: CreateProductDto): Promise<Product> {
    const kycApproved = await this.sellerKycService.isSellerKycApproved(sellerId);

    if (!kycApproved) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_SELLER_KYC_NOT_APPROVED);
    }

    await this.assertCategoryExists(dto.categoryId);
    await this.assertSkusAvailable(dto.variants.map((v) => v.sku));

    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const product = await this.productRepository.save(
        {
          sellerId,
          categoryId: dto.categoryId,
          name: dto.name,
          description: dto.description ?? null,
          basePrice: dto.basePrice,
          wholesalePrice: dto.wholesalePrice ?? null,
          mrp: dto.mrp ?? null,
          discountPercentage: dto.discountPercentage ?? null,
          currentPrice: this.computeCurrentPrice(dto.mrp, dto.discountPercentage),
          zone: dto.zone,
          status: ProductStatus.PENDING_APPROVAL,
        },
        queryRunner
      );

      const variants = await this.createVariants(product.id, dto.variants, queryRunner);

      if (dto.images?.length) {
        await this.createImages(product.id, dto.images, variants, queryRunner);
      }

      return product;
    });
  }

  async listOwn(sellerId: number, query: ListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.productRepository.findPaginatedForSeller(sellerId, {
      status: query.status,
      page,
      limit,
    });

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOwn(id: number, user: RequestUser): Promise<Product> {
    const product = await this.productRepository.findByIdWithRelations(id);

    const isAdmin = user.role.includes(UserRole.SUPERADMIN) || user.role.includes(UserRole.ADMIN);

    if (!product || (Number(product.sellerId) !== Number(user.id) && !isAdmin)) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  async update(id: number, dto: UpdateProductDto, user: RequestUser): Promise<Product> {
    const product = await this.productRepository.findByIdWithRelations(id);

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    assertOwnerOrAdmin(product, user);

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    if (dto.variants) {
      await this.assertSkusAvailable(
        dto.variants.map((v) => v.sku),
        product.id
      );
    }

    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const wasApproved = product.status === ProductStatus.APPROVED;

      const mrpChanged = dto.mrp !== undefined || dto.discountPercentage !== undefined;
      const effectiveMrp = dto.mrp !== undefined ? dto.mrp : product.mrp;
      const effectiveDiscount =
        dto.discountPercentage !== undefined ? dto.discountPercentage : product.discountPercentage;

      const payload: Partial<Product> = {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.wholesalePrice !== undefined && { wholesalePrice: dto.wholesalePrice }),
        ...(dto.mrp !== undefined && { mrp: dto.mrp }),
        ...(dto.discountPercentage !== undefined && { discountPercentage: dto.discountPercentage }),
        ...(mrpChanged && { currentPrice: this.computeCurrentPrice(effectiveMrp, effectiveDiscount) }),
        ...(dto.zone !== undefined && { zone: dto.zone }),
        ...(wasApproved && { status: ProductStatus.PENDING_APPROVAL }),
      };

      if (Object.keys(payload).length > 0) {
        await this.productRepository.updateById(id, payload, queryRunner);
      }

      let currentVariants = product.variants ?? [];

      if (dto.variants) {
        await this.productVariantRepository.deleteAllForProduct(id, queryRunner);
        currentVariants = await this.createVariants(id, dto.variants, queryRunner);
      }

      if (dto.images) {
        await this.productImageRepository.deleteAllForProduct(id, queryRunner);
        await this.createImages(id, dto.images, currentVariants, queryRunner);
      }

      // Re-fetch inside the same transaction rather than merging `payload` onto the
      // pre-update `product` — that merge left the response carrying stale
      // variants/images whenever either was replaced (caught via real-DB testing:
      // the DB write was correct, only the returned response body was wrong).
      return (await this.productRepository.findByIdWithRelations(id, queryRunner)) as Product;
    });
  }

  async remove(id: number, user: RequestUser): Promise<void> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    assertOwnerOrAdmin(product, user);

    await this.productRepository.softDeleteById(id);
  }

  async updateStatus(id: number, status: ProductStatus, sellerId: number): Promise<Product> {
    const product = await this.productRepository.findById(id);

    if (!product || Number(product.sellerId) !== Number(sellerId)) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    const allowedTransitions: Record<string, ProductStatus[]> = {
      [ProductStatus.APPROVED]: [ProductStatus.INACTIVE],
      [ProductStatus.INACTIVE]: [ProductStatus.APPROVED],
    };

    if (!allowedTransitions[product.status]?.includes(status)) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_INVALID_STATUS_TRANSITION, {
        from: product.status,
        to: status,
      });
    }

    await this.productRepository.updateById(id, { status });

    return { ...product, status };
  }

  /**
   * Super Admin / Admin views — every seller's products, not scoped to a `req.user.id`
   * like `listOwn`.
   */
  async adminList(query: AdminListProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.productRepository.findPaginatedForAdmin({
      status: query.status,
      sellerId: query.sellerId,
      categoryId: query.categoryId,
      page,
      limit,
    });

    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async adminGetById(id: number): Promise<Product> {
    const product = await this.productRepository.findByIdWithRelations(id);

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  private async assertPendingApproval(id: number): Promise<Product> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    if (product.status !== ProductStatus.PENDING_APPROVAL) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_INVALID_STATUS_TRANSITION, {
        from: product.status,
        to: ProductStatus.APPROVED,
      });
    }

    return product;
  }

  async approve(id: number, reviewerId: number): Promise<Product> {
    await this.assertPendingApproval(id);

    const payload = {
      status: ProductStatus.APPROVED,
      rejectionReason: null,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };

    await this.productRepository.updateById(id, payload);

    this.eventEmitter.emit('product.reviewed', { productId: id, status: ProductStatus.APPROVED, reviewerId });

    return (await this.productRepository.findById(id)) as Product;
  }

  async reject(id: number, reason: string, reviewerId: number): Promise<Product> {
    await this.assertPendingApproval(id);

    const payload = {
      status: ProductStatus.REJECTED,
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };

    await this.productRepository.updateById(id, payload);

    this.eventEmitter.emit('product.reviewed', {
      productId: id,
      status: ProductStatus.REJECTED,
      reason,
      reviewerId,
    });

    return (await this.productRepository.findById(id)) as Product;
  }
}
