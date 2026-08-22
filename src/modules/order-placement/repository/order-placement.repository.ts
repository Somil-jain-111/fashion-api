import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
//
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { OrderPlacement } from '../entities/order-placement.entity';
import { OrderPlacementStatus } from '../enum/order-placement.enum';

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
    return await this.getRepository(queryRunner).findOne({
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
    return await this.getRepository(queryRunner).findOne({
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

  async getSummary(
    userId: string | number,
    queryRunner?: QueryRunner
  ): Promise<{
    pendingOrders: number;
    approvedOrders: number;
    rejectedOrders: number;
    cancelledOrders: number;
    totalOrders: number;
  }> {
    const raw = await this.getRepository(queryRunner)
      .createQueryBuilder('order')
      .select('COUNT(*)', 'totalOrders')
      .addSelect('SUM(CASE WHEN order.status = :placedStatus THEN 1 ELSE 0 END)', 'pendingOrders')
      .addSelect(
        'SUM(CASE WHEN order.status = :approvedStatus THEN 1 ELSE 0 END)',
        'approvedOrders'
      )
      .addSelect(
        'SUM(CASE WHEN order.status = :rejectedStatus THEN 1 ELSE 0 END)',
        'rejectedOrders'
      )
      .addSelect(
        'SUM(CASE WHEN order.status = :cancelledStatus THEN 1 ELSE 0 END)',
        'cancelledOrders'
      )
      .where('order.user_id = :userId', { userId: String(userId) })
      .setParameters({
        placedStatus: OrderPlacementStatus.PLACED,
        approvedStatus: OrderPlacementStatus.APPROVED,
        rejectedStatus: OrderPlacementStatus.REJECTED,
        cancelledStatus: OrderPlacementStatus.CANCELLED,
      })
      .getRawOne();

    return {
      pendingOrders: Number(raw?.pendingOrders ?? 0),
      approvedOrders: Number(raw?.approvedOrders ?? 0),
      rejectedOrders: Number(raw?.rejectedOrders ?? 0),
      cancelledOrders: Number(raw?.cancelledOrders ?? 0),
      totalOrders: Number(raw?.totalOrders ?? 0),
    };
  }
}
