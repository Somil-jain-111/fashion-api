import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from 'src/modules/redemptions/entities/order.entity';
import { OrderPlacement } from 'src/modules/order-placement/entities/order-placement.entity';
import { PointHistory } from 'src/modules/redemptions/entities/point-history.entity';
import { Payout, PayoutStatus } from 'src/modules/payment/entities/payout.entity';
import { OrderStatus, ShippingStatus } from 'src/modules/redemptions/enum/order-status.enum';
import { ParentOrderType } from 'src/modules/redemptions/enum/order-type.enum';
import { ProductType } from 'src/modules/redemptions/enum/product-type.enum';
import { OrderPlacementStatus } from 'src/modules/order-placement/enum/order-placement.enum';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';

export interface ListRedemptionOrdersFilters {
  userId?: number;
  status?: OrderStatus;
  orderType?: ParentOrderType;
  productType?: ProductType;
  deliveryStatus?: ShippingStatus;
  search?: string;
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

  /**
   * Order items are one-to-many — joining them directly into a paginated query would multiply
   * rows and break skip/take (an order with 3 items could span/short a page). Page over order
   * ids first (no one-to-many join), then re-fetch just those ids with items/shipping/voucher
   * joined in a second, unpaginated query.
   */
  async listRedemptionOrders(filters: ListRedemptionOrdersFilters) {
    const idQb = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .orderBy('order.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit);

    if (filters.userId) idQb.andWhere('user.id = :userId', { userId: filters.userId });
    if (filters.status) idQb.andWhere('order.status = :status', { status: filters.status });
    if (filters.orderType) idQb.andWhere('order.order_type = :orderType', { orderType: filters.orderType });
    if (filters.fromDate) idQb.andWhere('order.createdAt >= :fromDate', { fromDate: filters.fromDate });
    if (filters.toDate) idQb.andWhere('order.createdAt <= :toDate', { toDate: filters.toDate });
    if (filters.search) {
      idQb.andWhere(
        '(order.order_number LIKE :search OR user.mobile LIKE :search OR user.firmName LIKE :search OR user.username LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }
    // Item-level filters use EXISTS subqueries rather than a join — a join here would multiply
    // the parent row per matching item and corrupt getManyAndCount()'s pagination totals.
    if (filters.productType) {
      idQb.andWhere(
        'EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = order.id AND oi.product_type = :productType)',
        { productType: filters.productType }
      );
    }
    if (filters.deliveryStatus) {
      idQb.andWhere(
        `EXISTS (
          SELECT 1 FROM order_items oi
          INNER JOIN shipping_details sd ON sd.order_item_id = oi.id
          WHERE oi.order_id = order.id AND sd.delivery_status = :deliveryStatus
        )`,
        { deliveryStatus: filters.deliveryStatus }
      );
    }

    const [idRows, total] = await idQb.getManyAndCount();
    if (!idRows.length) {
      return { items: [], total };
    }

    const items = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'orderItems')
      .leftJoinAndSelect('orderItems.shippingDetail', 'shippingDetail')
      .leftJoinAndSelect('orderItems.voucher', 'voucher')
      .where('order.id IN (:...ids)', { ids: idRows.map((row) => row.id) })
      .orderBy('order.id', 'DESC')
      .getMany();

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
