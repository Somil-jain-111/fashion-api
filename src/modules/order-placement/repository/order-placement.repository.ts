import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { OrderPlacement } from '../entities/order-placement.entity';
import { OrderPlacementSource, OrderPlacementStatus } from '../enum/order-placement.enum';

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

  async findAllByUser(
  userId: string | number,
  options: {
    page: number;
    limit: number;
    status?: OrderPlacementStatus;
    source?: OrderPlacementSource;
  },
  queryRunner?: QueryRunner
): Promise<[OrderPlacement[], number]> {
  const manager = queryRunner ? queryRunner.manager : this.repository.manager;

  const qb = manager
    .createQueryBuilder(OrderPlacement, 'order')
    .leftJoinAndSelect('order.items', 'items')
    .where('order.user_id = :userId', { userId: String(userId) })
    .orderBy('order.createdAt', 'DESC')
    .skip((options.page - 1) * options.limit)
    .take(options.limit);

  if (options.status) {
    qb.andWhere('order.status = :status', { status: options.status });
  }

  if (options.source) {
    qb.andWhere('order.source = :source', { source: options.source });
  }

  return qb.getManyAndCount();
}
}
