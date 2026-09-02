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
import { CategoryStatus } from '../categories/entities';
import { SellerKycService } from '../seller-kyc/seller-kyc.service';
import {
  ProductRepository,
  ProductVariantRepository,
  ProductImageRepository,
  ProductOptionRepository,
} from './repository';
import { Product, ProductOptionGroup, ProductVariant } from './entities';
import { CreateProductDto, ProductSubmissionAction } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductImageDto } from './dto/product-image.dto';
import { AdminListProductsQueryDto } from './dto/admin-list-products-query.dto';
import {
  AdminProductDetailResponseDto,
  AdminProductListResponseDto,
  AdminProductResponseDto,
} from './dto/product-response.dto';
import { ContentAuditRepository } from 'src/default/common/repositories/content-audit.repository';
import { ContentResourceType } from 'src/default/common/entities/content-audit.entity';

type RequestUser = { id: number; role: string[] };

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly productOptionRepository: ProductOptionRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly sellerKycService: SellerKycService,
    private readonly transactionService: TransactionService,
    private readonly eventEmitter: EventEmitter2,
    private readonly contentAuditRepository: ContentAuditRepository
  ) {}

  private async assertValidOptions(dto: {
    brandOptionId?: number;
    productTypeOptionId?: number;
    genderOptionId?: number;
    countryOptionId?: number;
    categoryId?: number;
    attributes?: Array<{ key: string; optionId?: number }>;
    variants?: Array<{ colorOptionId?: number; sizeOptionId?: number }>;
  }): Promise<void> {
    const expected = new Map<number, ProductOptionGroup>();
    if (dto.brandOptionId) expected.set(dto.brandOptionId, ProductOptionGroup.BRAND);
    if (dto.productTypeOptionId)
      expected.set(dto.productTypeOptionId, ProductOptionGroup.PRODUCT_TYPE);
    if (dto.genderOptionId) expected.set(dto.genderOptionId, ProductOptionGroup.GENDER);
    if (dto.countryOptionId) expected.set(dto.countryOptionId, ProductOptionGroup.COUNTRY);

    const attributeGroups: Record<string, ProductOptionGroup> = {
      material: ProductOptionGroup.MATERIAL,
      fit: ProductOptionGroup.FIT,
      neckType: ProductOptionGroup.NECK_TYPE,
      sleeve: ProductOptionGroup.SLEEVE,
      occasion: ProductOptionGroup.OCCASION,
    };
    for (const attribute of dto.attributes ?? []) {
      if (attribute.optionId && attributeGroups[attribute.key]) {
        expected.set(attribute.optionId, attributeGroups[attribute.key]);
      }
    }
    for (const variant of dto.variants ?? []) {
      if (variant.colorOptionId) expected.set(variant.colorOptionId, ProductOptionGroup.COLOR);
      if (variant.sizeOptionId) expected.set(variant.sizeOptionId, ProductOptionGroup.SIZE);
    }

    const options = await this.productOptionRepository.findActiveByIds([...expected.keys()]);
    const actual = new Map(options.map((option) => [Number(option.id), option]));
    for (const [id, group] of expected) {
      const option = actual.get(Number(id));
      if (
        !option ||
        option.group !== group ||
        (option.categoryId != null && Number(option.categoryId) !== Number(dto.categoryId))
      ) {
        throw new BusinessException(ERROR_CODES.VALIDATION.INVALID_PAYLOAD);
      }
    }
  }

  async getFormOptions(categoryId?: number) {
    if (categoryId) await this.assertCategoryExists(categoryId);
    const [categories, options] = await Promise.all([
      this.categoryRepository.findActive(),
      this.productOptionRepository.findActive(categoryId),
    ]);

    const grouped = Object.values(ProductOptionGroup).reduce<Record<string, unknown[]>>(
      (result, group) => ({
        ...result,
        [group]: options
          .filter((option) => option.group === group)
          .map(({ id, code, label }) => ({ id, code, label })),
      }),
      {}
    );

    const valuesFor = (group: ProductOptionGroup) =>
      options
        .filter((option) => option.group === group)
        .map(({ id, code, label }) => ({ id, code, label }));

    return {
      categories: categories.map(({ id, name, parentId, commissionRate }) => ({
        id,
        name,
        parentId,
        commissionRate,
      })),
      options: grouped,
      dropdowns: {
        brands: valuesFor(ProductOptionGroup.BRAND),
        productTypes: valuesFor(ProductOptionGroup.PRODUCT_TYPE),
        genders: valuesFor(ProductOptionGroup.GENDER),
        countries: valuesFor(ProductOptionGroup.COUNTRY),
        materials: valuesFor(ProductOptionGroup.MATERIAL),
        fits: valuesFor(ProductOptionGroup.FIT),
        neckTypes: valuesFor(ProductOptionGroup.NECK_TYPE),
        sleeves: valuesFor(ProductOptionGroup.SLEEVE),
        occasions: valuesFor(ProductOptionGroup.OCCASION),
        colors: valuesFor(ProductOptionGroup.COLOR),
        sizes: valuesFor(ProductOptionGroup.SIZE),
      },
    };
  }

  /**
   * currentPrice is always server-derived from mrp/discountPercentage, never
   * accepted directly from a request body. `undefined` mrp means "no MRP set" —
   * currentPrice stays null (product just uses basePrice/wholesalePrice, unchanged).
   */
  private computeCurrentPrice(
    mrp?: number | null,
    discountPercentage?: number | null
  ): number | null {
    if (mrp === null || mrp === undefined) {
      return null;
    }

    const discount = discountPercentage ?? 0;
    return Math.round(mrp * (1 - discount / 100) * 100) / 100;
  }

  private async assertCategoryExists(categoryId: number): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category || category.status !== CategoryStatus.APPROVED) {
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

  private async assertSellerSkuAvailable(
    sellerId: number,
    sellerSku: string,
    excludeProductId?: number
  ): Promise<void> {
    const existing = await this.productRepository.findBySellerSku(sellerId, sellerSku);
    if (existing && Number(existing.id) !== Number(excludeProductId ?? NaN)) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_SKU_ALREADY_EXISTS, {
        sku: sellerSku,
      });
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
            colorOptionId: variant.colorOptionId ?? null,
            sizeOptionId: variant.sizeOptionId ?? null,
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
    await this.assertValidOptions(dto);
    await this.assertSellerSkuAvailable(sellerId, dto.sellerSku);
    await this.assertSkusAvailable(dto.variants.map((v) => v.sku));

    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const product = await this.productRepository.save(
        {
          sellerId,
          categoryId: dto.categoryId,
          name: dto.name,
          sellerSku: dto.sellerSku,
          brandOptionId: dto.brandOptionId,
          productTypeOptionId: dto.productTypeOptionId,
          genderOptionId: dto.genderOptionId ?? null,
          countryOptionId: dto.countryOptionId ?? null,
          shortDescription: dto.shortDescription ?? null,
          description: dto.description ?? null,
          highlights: dto.highlights ?? null,
          materialAndFabric: dto.materialAndFabric ?? null,
          careInstructions: dto.careInstructions ?? null,
          attributeValues: dto.attributes ?? null,
          basePrice: dto.basePrice,
          wholesalePrice: dto.wholesalePrice ?? null,
          mrp: dto.mrp ?? null,
          discountPercentage: dto.discountPercentage ?? null,
          currentPrice: this.computeCurrentPrice(dto.mrp, dto.discountPercentage),
          zone: dto.zone,
          status:
            dto.submissionAction === ProductSubmissionAction.SAVE_DRAFT
              ? ProductStatus.DRAFT
              : ProductStatus.PENDING_APPROVAL,
        },
        queryRunner
      );

      const variants = await this.createVariants(product.id, dto.variants, queryRunner);

      if (dto.images?.length) {
        await this.createImages(product.id, dto.images, variants, queryRunner);
      }

      await this.contentAuditRepository.create(
        {
          resourceType: ContentResourceType.PRODUCT,
          resourceId: product.id,
          actorId: sellerId,
          actorRole: UserRole.SELLER_ADMIN,
          action: 'CREATED',
          changes: { status: product.status },
        },
        queryRunner
      );

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

    const isSeller =
      user.role.includes(UserRole.SELLER_ADMIN) &&
      !user.role.includes(UserRole.SUPERADMIN) &&
      !user.role.includes(UserRole.ADMIN);
    if (isSeller && !(await this.sellerKycService.isSellerKycApproved(user.id))) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_SELLER_KYC_NOT_APPROVED);
    }

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    await this.assertValidOptions({
      ...dto,
      categoryId: dto.categoryId ?? Number(product.categoryId),
    });

    if (dto.variants) {
      await this.assertSkusAvailable(
        dto.variants.map((v) => v.sku),
        product.id
      );
    }

    if (dto.sellerSku) {
      await this.assertSellerSkuAvailable(Number(product.sellerId), dto.sellerSku, product.id);
    }

    return await this.transactionService.runInTransaction(async (queryRunner) => {
      const hasRequestedChanges = Object.keys(dto).length > 0;

      const mrpChanged = dto.mrp !== undefined || dto.discountPercentage !== undefined;
      const effectiveMrp = dto.mrp !== undefined ? dto.mrp : product.mrp;
      const effectiveDiscount =
        dto.discountPercentage !== undefined ? dto.discountPercentage : product.discountPercentage;

      const payload: Partial<Product> = {
        ...(dto.sellerSku !== undefined && { sellerSku: dto.sellerSku }),
        ...(dto.brandOptionId !== undefined && { brandOptionId: dto.brandOptionId }),
        ...(dto.productTypeOptionId !== undefined && {
          productTypeOptionId: dto.productTypeOptionId,
        }),
        ...(dto.genderOptionId !== undefined && { genderOptionId: dto.genderOptionId }),
        ...(dto.countryOptionId !== undefined && { countryOptionId: dto.countryOptionId }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.highlights !== undefined && { highlights: dto.highlights }),
        ...(dto.materialAndFabric !== undefined && {
          materialAndFabric: dto.materialAndFabric,
        }),
        ...(dto.careInstructions !== undefined && { careInstructions: dto.careInstructions }),
        ...(dto.attributes !== undefined && { attributeValues: dto.attributes }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.wholesalePrice !== undefined && { wholesalePrice: dto.wholesalePrice }),
        ...(dto.mrp !== undefined && { mrp: dto.mrp }),
        ...(dto.discountPercentage !== undefined && { discountPercentage: dto.discountPercentage }),
        ...(mrpChanged && {
          currentPrice: this.computeCurrentPrice(effectiveMrp, effectiveDiscount),
        }),
        ...(dto.zone !== undefined && { zone: dto.zone }),
        ...(isSeller &&
          hasRequestedChanges && {
            status:
              dto.submissionAction === ProductSubmissionAction.SAVE_DRAFT
                ? ProductStatus.DRAFT
                : ProductStatus.PENDING_APPROVAL,
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
          }),
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

      if (hasRequestedChanges)
        await this.contentAuditRepository.create(
          {
            resourceType: ContentResourceType.PRODUCT,
            resourceId: id,
            actorId: user.id,
            actorRole: user.role.join(','),
            action: 'UPDATED',
            changes: {
              fields: [
                ...Object.keys(dto).filter((field) => field !== 'variants' && field !== 'images'),
                ...(dto.variants ? ['variants'] : []),
                ...(dto.images ? ['images'] : []),
              ],
              fromStatus: product.status,
              toStatus: isSeller
                ? dto.submissionAction === ProductSubmissionAction.SAVE_DRAFT
                  ? ProductStatus.DRAFT
                  : ProductStatus.PENDING_APPROVAL
                : product.status,
            },
          },
          queryRunner
        );

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

    return {
      items: items.map((product) => this.toAdminProductResponse(product)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    } as unknown as AdminProductListResponseDto;
  }

  async adminGetById(id: number): Promise<AdminProductDetailResponseDto> {
    const product = await this.productRepository.findAdminByIdWithSeller(id);

    if (!product) {
      throw new BusinessException(ERROR_CODES.PRODUCT.PRODUCT_NOT_FOUND);
    }

    const audit = await this.contentAuditRepository.list(ContentResourceType.PRODUCT, id);
    return {
      ...this.toAdminProductResponse(product),
      audit,
    } as unknown as AdminProductDetailResponseDto;
  }

  private toAdminProductResponse(product: Product): AdminProductResponseDto {
    const seller = product.seller;
    const store = seller?.storeInformation;

    const { seller: _seller, ...safeProduct } = product;
    return {
      ...safeProduct,
      sellerBasicDetails: {
        id: String(seller?.id ?? ''),
        uuid: String(seller?.uuid ?? ''),
        username: String(seller?.username ?? ''),
        email: String(seller?.email ?? ''),
        mobile: String(seller?.mobile ?? ''),
        status: String(seller?.status ?? ''),
        imageUrl: String(seller?.image_url ?? ''),
        ratingAverage: String(seller?.ratingAverage ?? ''),
        ratingCount: String(seller?.ratingCount ?? ''),
        storeName: String(store?.storeName ?? ''),
        businessType: String(store?.businessType ?? ''),
        city: String(store?.city ?? ''),
        state: String(store?.state ?? ''),
        contactName: String(store?.contactName ?? ''),
        contactEmail: String(store?.contactEmail ?? ''),
        contactPhone: String(store?.contactPhone ?? ''),
        onboardingStatus: String(store?.onboardingStatus ?? ''),
      },
    } as unknown as AdminProductResponseDto;
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
    const product = await this.assertPendingApproval(id);

    const payload = {
      status: ProductStatus.APPROVED,
      rejectionReason: null,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };

    await this.transactionService.runInTransaction(async (queryRunner) => {
      await this.productRepository.updateById(id, payload, queryRunner);
      await this.contentAuditRepository.create(
        {
          resourceType: ContentResourceType.PRODUCT,
          resourceId: id,
          actorId: reviewerId,
          actorRole: UserRole.SUPERADMIN,
          action: 'APPROVED',
          changes: { fromStatus: product.status, toStatus: ProductStatus.APPROVED },
        },
        queryRunner
      );
    });

    this.eventEmitter.emit('product.reviewed', {
      productId: id,
      status: ProductStatus.APPROVED,
      reviewerId,
    });

    return (await this.productRepository.findById(id)) as Product;
  }

  async reject(id: number, reason: string, reviewerId: number): Promise<Product> {
    const product = await this.assertPendingApproval(id);

    const payload = {
      status: ProductStatus.REJECTED,
      rejectionReason: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    };

    await this.transactionService.runInTransaction(async (queryRunner) => {
      await this.productRepository.updateById(id, payload, queryRunner);
      await this.contentAuditRepository.create(
        {
          resourceType: ContentResourceType.PRODUCT,
          resourceId: id,
          actorId: reviewerId,
          actorRole: UserRole.SUPERADMIN,
          action: 'REJECTED',
          changes: { fromStatus: product.status, toStatus: ProductStatus.REJECTED, reason },
        },
        queryRunner
      );
    });

    this.eventEmitter.emit('product.reviewed', {
      productId: id,
      status: ProductStatus.REJECTED,
      reason,
      reviewerId,
    });

    return (await this.productRepository.findById(id)) as Product;
  }
}
