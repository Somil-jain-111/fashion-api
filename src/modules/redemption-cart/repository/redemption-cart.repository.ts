import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import {
  RedemptionCart,
  RedemptionCartItem,
  RedemptionCartStatus,
} from 'src/modules/auth/entities';
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
        status: RedemptionCartStatus.ACTIVE,
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
}
