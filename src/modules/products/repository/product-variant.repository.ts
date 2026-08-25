import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ProductVariant } from '../entities';

@Injectable()
export class ProductVariantRepository extends BaseRepository<ProductVariant> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(ProductVariant));
  }

  async deleteAllForProduct(productId: number, queryRunner: QueryRunner): Promise<void> {
    await this.getRepository(queryRunner).delete({ productId } as any);
  }

  async findBySku(sku: string, queryRunner?: QueryRunner): Promise<ProductVariant | null> {
    return await this.getRepository(queryRunner).findOne({ where: { sku } as any });
  }
}
