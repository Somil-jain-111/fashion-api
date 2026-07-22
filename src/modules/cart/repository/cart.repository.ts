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

    return repo
      .createQueryBuilder('cart')
      .leftJoinAndSelect('cart.user', 'user')
      .leftJoinAndSelect('cart.distributor', 'distributor')
      .leftJoinAndSelect('cart.items', 'items')
      .where('cart.user_id = :userId', { userId })
      .andWhere('cart.distributor_id = :distributorId', { distributorId })
      .andWhere('cart.is_active = true')
      .orderBy('items.created_at', 'DESC')
      .getOne();
  }

  async findLatestActiveByUser(userId: string | number): Promise<Cart | null> {
    return this.repository
      .createQueryBuilder('cart')
      .leftJoinAndSelect('cart.user', 'user')
      .leftJoinAndSelect('cart.distributor', 'distributor')
      .leftJoinAndSelect('cart.items', 'items')
      .where('cart.user_id = :userId', { userId })
      .andWhere('cart.is_active = true')
      .orderBy('cart.updated_at', 'DESC')
      .addOrderBy('items.created_at', 'DESC')
      .getOne();
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
