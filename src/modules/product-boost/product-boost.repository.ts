import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  BoostOrderStatus,
  BoostTargetType,
  ProductBoostCampaign,
  ProductBoostOrder,
  ProductBoostOrderItem,
} from './entities';

@Injectable()
export class ProductBoostRepository {
  constructor(private readonly dataSource: DataSource) {}

  async hasPendingOrActiveBoost(
    sellerId: number,
    productId: number,
    manager?: EntityManager
  ): Promise<boolean> {
    const orderRepository = manager
      ? manager.getRepository(ProductBoostOrder)
      : this.dataSource.getRepository(ProductBoostOrder);
    const campaignRepository = manager
      ? manager.getRepository(ProductBoostCampaign)
      : this.dataSource.getRepository(ProductBoostCampaign);
    const pending = await orderRepository
      .createQueryBuilder('boostOrder')
      .innerJoin(ProductBoostOrderItem, 'item', 'item.order_id = boostOrder.id')
      .where('boostOrder.sellerId = :sellerId', { sellerId })
      .andWhere('item.productId = :productId', { productId })
      .andWhere('boostOrder.status = :status', { status: BoostOrderStatus.PENDING_PAYMENT })
      .andWhere('boostOrder.expiresAt > UTC_TIMESTAMP()')
      .getExists();
    if (pending) return true;

    return campaignRepository
      .createQueryBuilder('campaign')
      .where('campaign.sellerId = :sellerId', { sellerId })
      .andWhere('campaign.productId = :productId', { productId })
      .andWhere('campaign.startsAt <= UTC_TIMESTAMP()')
      .andWhere('campaign.endsAt > UTC_TIMESTAMP()')
      .getExists();
  }

  createOrderItems(
    items: Partial<ProductBoostOrderItem>[],
    manager: EntityManager
  ): Promise<ProductBoostOrderItem[]> {
    const repository = manager.getRepository(ProductBoostOrderItem);
    return repository.save(repository.create(items));
  }

  createOrder(
    data: Partial<ProductBoostOrder>,
    manager?: EntityManager
  ): Promise<ProductBoostOrder> {
    const repository = manager
      ? manager.getRepository(ProductBoostOrder)
      : this.dataSource.getRepository(ProductBoostOrder);
    return repository.save(repository.create(data));
  }

  async listSellerOrders(sellerId: number): Promise<ProductBoostOrder[]> {
    return this.dataSource.getRepository(ProductBoostOrder).find({
      where: { sellerId },
      relations: { items: true },
      select: {
        id: true,
        publicId: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        expiresAt: true,
        createdAt: true,
        items: {
          id: true,
          productId: true,
          categoryId: true,
          targetType: true,
          durationDays: true,
          lineAmount: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findOrderForUpdate(publicId: string, manager: EntityManager) {
    const order = await manager
      .getRepository(ProductBoostOrder)
      .createQueryBuilder('boostOrder')
      .setLock('pessimistic_write')
      .where('boostOrder.publicId = :publicId', { publicId })
      .getOne();
    if (order) {
      order.items = await manager.getRepository(ProductBoostOrderItem).find({
        where: { orderId: order.id },
      });
    }
    return order;
  }

  async paymentIdExists(paymentId: string, manager: EntityManager): Promise<boolean> {
    return manager.getRepository(ProductBoostOrder).exist({ where: { paymentId } });
  }

  async activatePaidOrder(
    order: ProductBoostOrder,
    paymentId: string,
    manager: EntityManager
  ): Promise<void> {
    const now = new Date();

    await manager.getRepository(ProductBoostOrder).update(order.id, {
      status: BoostOrderStatus.PAID,
      paymentId,
      paidAt: now,
    });
    await manager.getRepository(ProductBoostCampaign).save(
      order.items.map((item) => ({
        orderId: order.id,
        orderItemId: item.id,
        sellerId: order.sellerId,
        productId: item.productId,
        categoryId: item.categoryId,
        targetType: item.targetType,
        startsAt: now,
        endsAt: new Date(now.getTime() + item.durationDays * 24 * 60 * 60 * 1000),
      }))
    );
  }

  async findActiveProductIds(
    productIds: number[],
    includeCategoryBoosts: boolean
  ): Promise<Set<number>> {
    if (!productIds.length) return new Set();
    const rows = await this.dataSource
      .getRepository(ProductBoostCampaign)
      .createQueryBuilder('campaign')
      .select('DISTINCT campaign.productId', 'productId')
      .where('campaign.productId IN (:...productIds)', { productIds })
      .andWhere('campaign.startsAt <= UTC_TIMESTAMP()')
      .andWhere('campaign.endsAt > UTC_TIMESTAMP()')
      .andWhere(
        includeCategoryBoosts
          ? 'campaign.targetType IN (:...targetTypes)'
          : 'campaign.targetType = :productTarget',
        includeCategoryBoosts
          ? { targetTypes: [BoostTargetType.PRODUCT, BoostTargetType.CATEGORY] }
          : { productTarget: BoostTargetType.PRODUCT }
      )
      .getRawMany<{ productId: string }>();
    return new Set(rows.map((row) => Number(row.productId)));
  }
}
