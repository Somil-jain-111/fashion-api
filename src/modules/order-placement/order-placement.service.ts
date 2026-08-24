import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';

import { CartItemRepository, CartRepository } from 'src/modules/cart/repository';
import { CartCalculationHelper } from 'src/modules/cart/helper/cart-calculation.helper';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { TransactionService } from 'src/default/databases/transaction';
import { CreateOrderPlacementDto } from './dto/create-order-placement.dto';
import { OrderPlacementResponseDto } from './dto/order-placement-response.dto';
import { OrderPlacementItem } from './entities/order-placement-item.entity';
import { OrderPlacement } from './entities/order-placement.entity';
import { OrderPlacementSource, OrderPlacementStatus } from './enum/order-placement.enum';
import { OrderPlacementHelper } from './helper/order-placement.helper';
import { OrderPlacementItemRepository, OrderPlacementRepository } from './repository';
import { GetOrderHistoryQueryDto } from './dto/get-order-history-query.dto';
import { OrderHistoryResponseDto } from './dto/order-history-response.dto';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { NotificationsService } from 'src/modules/notifications/notifications.service';
import { NotificationEventType } from 'src/modules/notifications/enum/notification-event-type.enum';

@Injectable()
export class OrderPlacementService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly orderPlacementRepository: OrderPlacementRepository,
    private readonly orderPlacementItemRepository: OrderPlacementItemRepository,
    private readonly cartRepository: CartRepository,
    private readonly cartItemRepository: CartItemRepository,
    private readonly notifications: NotificationsService
  ) {}

  async placeOrder(
    userId: string | number,
    dto: CreateOrderPlacementDto
  ): Promise<OrderPlacementResponseDto> {
    const tag = 'OrderPlacementService.placeOrder';

    ConsoleLogger.log('ORDER_PLACEMENT_START', {
      tag,
      data: { userId, source: dto.source, distributorId: dto.distributorId },
    });

    const order = await this.transactionService.runInTransaction(async (queryRunner) => {
      const orderItems = await this.resolveOrderItems(userId, dto, queryRunner);

      if (!orderItems.length) {
        throw new BusinessException(ERROR_CODES.CART.CART_IS_EMPTY);
      }

      const summary = CartCalculationHelper.calculateSummary(
        orderItems.map((item) => ({ ...item, isSelected: true })) as any
      );

      const createdOrder = await this.orderPlacementRepository.save(
        {
          orderNumber: await this.generateUniqueOrderNumber(queryRunner),
          user_id: String(userId),
          distributor_id: String(dto.distributorId),
          source: dto.source,
          status: OrderPlacementStatus.PLACED,
          totalQuantity: summary.totalQuantity,
          totalAmount: summary.totalAmount,
          discountAmount: summary.discountAmount,
          gstAmount: summary.gstAmount,
          totalPayable: summary.totalPayable,
        },
        queryRunner
      );

      await this.orderPlacementItemRepository.saveManyWithTransaction(
        orderItems.map((item) => ({
          ...item,
          order_id: Number(createdOrder.id),
        })),
        queryRunner
      );

      if (dto.source === OrderPlacementSource.CART) {
        const cart = await this.cartRepository.findActiveByUserAndDistributor(
          userId,
          dto.distributorId,
          queryRunner
        );

        if (cart) {
          await this.cartItemRepository.deleteByCartId(cart.id, queryRunner);
          await this.cartRepository.deleteByIdWithTransaction(cart.id, queryRunner);
        }
      }

      const freshOrder = await this.orderPlacementRepository.findByIdAndUser(
        Number(createdOrder.id),
        userId,
        queryRunner
      );

      return freshOrder || createdOrder;
    });

    ConsoleLogger.log('ORDER_PLACEMENT_SUCCESS', {
      tag,
      data: { userId, orderId: order.id, orderNumber: order.orderNumber },
    });

    await this.notifications.notify(
      String(userId),
      NotificationEventType.ORDER_PLACED,
      { orderNumber: order.orderNumber, totalAmount: order.totalPayable },
      { type: 'order_placement', id: String(order.id) }
    );

    return this.toResponse(order);
  }

  async findOne(userId: string | number, orderId: string): Promise<OrderPlacementResponseDto> {
    const order = await this.orderPlacementRepository.findByIdAndUser(Number(orderId), userId);

    if (!order) {
      throw new BusinessException(ERROR_CODES.ORDER.ORDER_NOT_FOUND);
    }

    return this.toResponse(order);
  }

  private async resolveOrderItems(
    userId: string | number,
    dto: CreateOrderPlacementDto,
    queryRunner: QueryRunner
  ): Promise<Partial<OrderPlacementItem>[]> {
    if (dto.source === OrderPlacementSource.BUY_NOW) {
      if (!dto.buyNowItem) {
        throw new BusinessException(ERROR_CODES.ORDER_ITEM.ORDER_ITEM_PRODUCT_REQUIRED);
      }

      return [
        OrderPlacementHelper.buildOrderItem({
          productId: dto.buyNowItem.productId,
          color: dto.buyNowItem.color,
          size: dto.buyNowItem.size,
          cartonSize: dto.buyNowItem.cartonSize,
          cartonQuantity: dto.buyNowItem.cartonQuantity ?? 1,
        }),
      ];
    }

    const cart = await this.cartRepository.findActiveByUserAndDistributor(
      userId,
      dto.distributorId,
      queryRunner
    );

    if (!cart || !cart.items?.length) {
      throw new BusinessException(ERROR_CODES.CART.CART_IS_EMPTY);
    }

    const selectedItems = cart.items.filter((item) => item.isSelected);

    if (!selectedItems.length) {
      throw new BusinessException(ERROR_CODES.CART.CART_IS_EMPTY);
    }

    return selectedItems.map((item) => {
      const product = OrderPlacementHelper.getProductOrThrow(item.productId);

      return {
        productId: item.productId,
        categoryId: item.categoryId,
        subCategoryId: item.subCategoryId,
        productName: product.name,
        thumbnail: product.thumbnail || null,
        color: item.color,
        size: item.size,
        cartonSize: item.cartonSize,
        cartonQuantity: item.cartonQuantity,
        totalArticles: item.totalArticles,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        discount: item.discount,
        totalAmount: item.totalAmount,
      };
    });
  }

  private async generateUniqueOrderNumber(queryRunner: QueryRunner): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const orderNumber = OrderPlacementHelper.generateOrderNumber();
      const existing = await this.orderPlacementRepository.findByOrderNumber(
        orderNumber,
        queryRunner
      );

      if (!existing) {
        return orderNumber;
      }
    }

    throw new BusinessException(ERROR_CODES.ORDER.ORDER_CREATION_FAILED);
  }

  private toResponse(order: OrderPlacement): OrderPlacementResponseDto {
    return {
      id: order.id?.toString(),
      orderNumber: order.orderNumber,
      userId: order.user_id?.toString(),
      distributorId: order.distributor_id?.toString(),
      source: order.source,
      status: order.status,
      totalQuantity: order.totalQuantity,
      totalAmount: CartCalculationHelper.toMoney(order.totalAmount),
      discountAmount: CartCalculationHelper.toMoney(order.discountAmount),
      gstAmount: CartCalculationHelper.toMoney(order.gstAmount),
      totalPayable: CartCalculationHelper.toMoney(order.totalPayable),
      orderDate: order.createdAt.toISOString(),
      items: (order.items || []).map((item) => ({
        id: item.id?.toString(),
        productId: item.productId?.toString(),
        categoryId: item.categoryId?.toString(),
        subCategoryId: item.subCategoryId?.toString(),
        productName: item.productName,
        thumbnail: item.thumbnail,
        color: item.color,
        size: item.size,
        cartonSize: item.cartonSize,
        cartonQuantity: item.cartonQuantity,
        totalArticles: item.totalArticles,
        unitPrice: CartCalculationHelper.toMoney(item.unitPrice),
        mrp: CartCalculationHelper.toMoney(item.mrp),
        discount: CartCalculationHelper.toMoney(item.discount),
        totalAmount: CartCalculationHelper.toMoney(item.totalAmount),
      })),
    };
  }

  async getOrderHistory(
    userId: string | number,
    query: GetOrderHistoryQueryDto
  ): Promise<OrderHistoryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search;

    const [orders, totalItems] = await this.orderPlacementRepository.findAllByUser(userId, {
      page,
      limit,
      status: query.status,
      search,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return {
      items: orders.map((order) => this.toResponse(order)),
      pagination: CommonUtils.generatePaginationResponse(totalItems, page, limit),
    };
  }

  async getSummary(userId: string | number) {
    return this.orderPlacementRepository.getSummary(userId);
  }
}
