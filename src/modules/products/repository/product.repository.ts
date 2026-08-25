import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { Product } from '../entities';

@Injectable()
export class ProductRepository extends BaseRepository<Product> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Product));
  }

  async findByIdWithRelations(id: number, queryRunner?: QueryRunner): Promise<Product | null> {
    return await this.getRepository(queryRunner).findOne({
      where: { id } as any,
      relations: ['variants', 'images', 'category'],
    });
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
      .leftJoinAndSelect('product.seller', 'seller');

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
