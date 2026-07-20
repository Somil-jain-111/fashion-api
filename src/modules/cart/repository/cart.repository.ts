import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { Cart } from '../entities/cart.entity';

@Injectable()
export class CartRepository extends BaseRepository<Cart> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(Cart));
  }

  async findActiveByUserAndDistributor(
    userId: string | number,
    distributorId: string | number,
    queryRunner?: QueryRunner
  ): Promise<Cart | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Cart) : this.repository;

    return repo.findOne({
      where: {
        user_id: String(userId),
        distributor_id: String(distributorId),
        is_active: true,
      } as any,
      relations: ['items'],
      order: {
        items: {
          createdAt: 'DESC',
        },
      } as any,
    });
  }

  async findLatestActiveByUser(userId: string | number): Promise<Cart | null> {
    return this.repository.findOne({
      where: {
        user_id: String(userId),
        is_active: true,
      } as any,
      relations: ['items'],
      order: {
        updatedAt: 'DESC',
        items: {
          createdAt: 'DESC',
        },
      } as any,
    });
  }

  async deleteByIdWithTransaction(
    cartId: string | number,
    queryRunner?: QueryRunner
  ): Promise<number> {
    const repo = queryRunner ? queryRunner.manager.getRepository(Cart) : this.repository;
    const result = await repo.delete({ id: String(cartId) } as any);
    return Number(result.affected ?? 0);
  }
}
