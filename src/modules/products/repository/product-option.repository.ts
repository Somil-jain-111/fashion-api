import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { ProductOption, ProductOptionGroup } from '../entities/product-option.entity';

@Injectable()
export class ProductOptionRepository extends BaseRepository<ProductOption> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(ProductOption));
  }

  async findActive(categoryId?: number): Promise<ProductOption[]> {
    const qb = this.repository
      .createQueryBuilder('option')
      .select([
        'option.id',
        'option.group',
        'option.code',
        'option.label',
        'option.categoryId',
        'option.sortOrder',
      ])
      .where('option.isActive = :active', { active: true });

    if (categoryId) {
      qb.andWhere('(option.categoryId IS NULL OR option.categoryId = :categoryId)', { categoryId });
    } else {
      qb.andWhere('option.categoryId IS NULL');
    }

    return qb.orderBy('option.group', 'ASC').addOrderBy('option.sortOrder', 'ASC').getMany();
  }

  async findActiveByIds(ids: number[]): Promise<ProductOption[]> {
    if (!ids.length) return [];
    return this.repository
      .createQueryBuilder('option')
      .select(['option.id', 'option.group', 'option.categoryId'])
      .where('option.id IN (:...ids)', { ids })
      .andWhere('option.isActive = :active', { active: true })
      .getMany();
  }

  async findActiveByGroup(group: ProductOptionGroup): Promise<ProductOption[]> {
    return this.repository.find({
      select: ['id', 'code', 'label', 'sortOrder'] as any,
      where: { group, isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' } as any,
    });
  }
}
