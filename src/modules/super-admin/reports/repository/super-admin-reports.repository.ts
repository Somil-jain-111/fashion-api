import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from 'src/modules/redemptions/entities/order.entity';
import { OrderPlacement } from 'src/modules/order-placement/entities/order-placement.entity';
import { PointHistory } from 'src/modules/redemptions/entities/point-history.entity';
import { Payout, PayoutStatus } from 'src/modules/payment/entities/payout.entity';
import { OrderStatus } from 'src/modules/redemptions/enum/order-status.enum';
import { OrderPlacementStatus } from 'src/modules/order-placement/enum/order-placement.enum';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';

export interface ListRedemptionOrdersFilters {
  userId?: number;
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}

export interface ListStockOrdersFilters {
  userId?: number;
  distributorId?: number;
  status?: OrderPlacementStatus;
  page: number;
  limit: number;
}

export interface ListPointsFilters {
  userId?: number;
  type?: RedemptionType;
  status?: PointStatusEnum;
  page: number;
  limit: number;
}

export interface ListDbtPayoutsFilters {
  userId?: number;
  status?: PayoutStatus;
  page: number;
  limit: number;
}

@Injectable()
export class SuperAdminReportsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listRedemptionOrders(filters: ListRedemptionOrdersFilters) {
    const qb = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.userId) qb.andWhere('user.id = :userId', { userId: filters.userId });
    if (filters.status) qb.andWhere('order.status = :status', { status: filters.status });
    if (filters.fromDate) qb.andWhere('order.createdAt >= :fromDate', { fromDate: filters.fromDate });
    if (filters.toDate) qb.andWhere('order.createdAt <= :toDate', { toDate: filters.toDate });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listStockOrders(filters: ListStockOrdersFilters) {
    const qb = this.dataSource
      .getRepository(OrderPlacement)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.distributor', 'distributor')
      .orderBy('order.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.userId) qb.andWhere('user.id = :userId', { userId: filters.userId });
    if (filters.distributorId)
      qb.andWhere('distributor.id = :distributorId', { distributorId: filters.distributorId });
    if (filters.status) qb.andWhere('order.status = :status', { status: filters.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listPoints(filters: ListPointsFilters) {
    const qb = this.dataSource
      .getRepository(PointHistory)
      .createQueryBuilder('point')
      .leftJoinAndSelect('point.user', 'user')
      .orderBy('point.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.userId) qb.andWhere('user.id = :userId', { userId: filters.userId });
    if (filters.type) qb.andWhere('point.type = :type', { type: filters.type });
    if (filters.status) qb.andWhere('point.status = :status', { status: filters.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listDbtPayouts(filters: ListDbtPayoutsFilters) {
    const qb = this.dataSource
      .getRepository(Payout)
      .createQueryBuilder('payout')
      .leftJoinAndSelect('payout.user', 'user')
      .orderBy('payout.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.userId) qb.andWhere('user.id = :userId', { userId: filters.userId });
    if (filters.status) qb.andWhere('payout.status = :status', { status: filters.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
