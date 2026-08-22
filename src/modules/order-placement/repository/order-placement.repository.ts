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
      search?: string;
      startDate?: string;
      endDate?: string;
    },
    queryRunner?: QueryRunner
  ): Promise<[OrderPlacement[], number]> {
    const qb = this.getRepository(queryRunner)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.user_id = :userId', { userId: String(userId) })
      .orderBy('order.createdAt', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit);

    if (options.status) {
      qb.andWhere('order.status = :status', { status: options.status });
    }

    if (options.search) {
      qb.andWhere('order.orderNumber LIKE :search', {
        search: `%${options.search.trim()}%`,
      });
    }

    if (options.startDate) {
      qb.andWhere('order.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      qb.andWhere('order.createdAt <= :endDate', { endDate: `${options.endDate} 23:59:59` });
    }

    return qb.getManyAndCount();
  }
}
