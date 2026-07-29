import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import { RedemptionCart, RedemptionCartItem } from 'src/modules/auth/entities';
import { BaseRepository } from 'src/default/common/repositories/base.repository';

@Injectable()
export class RedemptionCartRepository extends BaseRepository<RedemptionCart> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(RedemptionCart));
  }

  async findActiveCartByUser(
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<RedemptionCart | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(RedemptionCart) : this.repository;
    return repo.findOne({
      where: {
        user: { id: userId },
      },
      order: {
        id: 'ASC',
      },
      relations: ['items'],
    });
  }
}

@Injectable()
export class RedemptionCartItemRepository extends BaseRepository<RedemptionCartItem> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(RedemptionCartItem));
  }

  async deleteCartItemsByCartId(cartId: number, queryRunner?: QueryRunner) {
    const repo = this.getRepository(queryRunner);

    return await repo.delete({ cart: { id: cartId } });
  }
}
