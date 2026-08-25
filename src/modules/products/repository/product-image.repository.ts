import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ProductImage } from '../entities';

@Injectable()
export class ProductImageRepository extends BaseRepository<ProductImage> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(ProductImage));
  }

  async deleteAllForProduct(productId: number, queryRunner: QueryRunner): Promise<void> {
    await this.getRepository(queryRunner).delete({ productId } as any);
  }
}
