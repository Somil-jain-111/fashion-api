import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { OrderPlacement } from '../entities/order-placement.entity';

@Injectable()
export class OrderPlacementRepository extends BaseRepository<OrderPlacement> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(OrderPlacement));
  }

  async findByIdAndUser(
    orderId: number,
    userId: string | number,
    queryRunner?: QueryRunner
  ): Promise<OrderPlacement | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OrderPlacement) : this.repository;

    return repo.findOne({
      where: {
        id: orderId,
        user_id: String(userId),
      } as any,
      relations: ['items'],
    });
  }

  async findByOrderNumber(
    orderNumber: string,
    queryRunner?: QueryRunner
  ): Promise<OrderPlacement | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(OrderPlacement) : this.repository;

    return repo.findOne({
      where: { orderNumber } as any,
    });
  }
}
