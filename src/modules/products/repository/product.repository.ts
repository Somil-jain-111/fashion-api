import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { Product } from '../entities';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Product));
  }

  async findBySellerSku(sellerId: number, sellerSku: string): Promise<Product | null> {
    return this.repository.findOne({
      select: { id: true, sellerId: true, sellerSku: true } as any,
      where: { sellerId, sellerSku } as any,
    });
  }

  async findByIdWithRelations(id: number, queryRunner?: QueryRunner): Promise<Product | null> {
    return await this.getRepository(queryRunner).findOne({
      where: { id } as any,
      relations: ['variants', 'images', 'category'],
    });
  }

  async findAdminByIdWithSeller(id: number): Promise<Product | null> {
    return this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoin('product.seller', 'seller')
      .addSelect([
        'seller.id',
        'seller.uuid',
        'seller.username',
        'seller.email',
        'seller.mobile',
        'seller.status',
        'seller.image_url',
        'seller.ratingAverage',
        'seller.ratingCount',
      ])
      .leftJoin('seller.storeInformation', 'store')
      .addSelect([
        'store.id',
        'store.sellerId',
        'store.storeName',
        'store.businessType',
        'store.city',
        'store.state',
        'store.contactName',
        'store.contactEmail',
        'store.contactPhone',
        'store.onboardingStatus',
      ])
      .where('product.id = :id', { id })
      .getOne();
  }

  async findBoostEligibility(
    productId: number
  ): Promise<Pick<Product, 'id' | 'sellerId' | 'categoryId' | 'status'> | null> {
    return this.repository.findOne({
      where: { id: productId } as any,
      select: { id: true, sellerId: true, categoryId: true, status: true },
    }) as Promise<Pick<Product, 'id' | 'sellerId' | 'categoryId' | 'status'> | null>;
  }

  async findBoostEligibilityForUpdate(productId: number, manager: EntityManager) {
    return manager
      .getRepository(Product)
      .createQueryBuilder('product')
      .select(['product.id', 'product.sellerId', 'product.categoryId', 'product.status'])
      .setLock('pessimistic_write')
      .where('product.id = :productId', { productId })
      .getOne();
  }

  async findPaginatedForSeller(
    sellerId: number,
    options: { status?: ProductStatus; page: number; limit: number }
  ): Promise<[Product[], number]> {
    const { status, page, limit } = options;

    const qb = this.repository
      .createQueryBuilder('product')
      .where('product.sellerId = :sellerId', { sellerId });

    if (status) {
      qb.andWhere('product.status = :status', { status });
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return await qb.getManyAndCount();
  }

  async findPaginatedForAdmin(options: {
    status?: ProductStatus;
    sellerId?: number;
    categoryId?: number;
    page: number;
    limit: number;
  }): Promise<[Product[], number]> {
    const { status, sellerId, categoryId, page, limit } = options;

    const qb = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoin('product.seller', 'seller')
      .addSelect([
        'seller.id',
        'seller.uuid',
        'seller.username',
        'seller.email',
        'seller.mobile',
        'seller.status',
        'seller.image_url',
        'seller.ratingAverage',
        'seller.ratingCount',
      ])
      .leftJoin('seller.storeInformation', 'store')
      .addSelect([
        'store.id',
        'store.sellerId',
        'store.storeName',
        'store.businessType',
        'store.city',
        'store.state',
        'store.contactName',
        'store.contactEmail',
        'store.contactPhone',
        'store.onboardingStatus',
      ]);

    if (status) {
      qb.andWhere('product.status = :status', { status });
    }

    if (sellerId) {
      qb.andWhere('product.sellerId = :sellerId', { sellerId });
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return await qb.getManyAndCount();
  }
}
