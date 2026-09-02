import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { AppConfigService } from 'src/default/config/config.service';
import { ProductStatus } from 'src/default/common/enums/product.enum';
import { TransactionService } from 'src/default/databases/transaction';
import { ProductRepository } from '../products/repository';
import { BoostOrderStatus, BoostTargetType } from './entities';
import { BoostPaymentWebhookDto, CreateBoostOrderDto } from './dto';
import { ProductBoostRepository } from './product-boost.repository';
import { SellerKycService } from '../seller-kyc/seller-kyc.service';

@Injectable()
export class ProductBoostService {
  constructor(
    private readonly boostRepository: ProductBoostRepository,
    private readonly productRepository: ProductRepository,
    private readonly transactionService: TransactionService,
    private readonly appConfigService: AppConfigService,
    private readonly sellerKycService: SellerKycService
  ) {}

  getPricing() {
    return {
      currency: 'INR',
      pricePerDay: this.getPricePerDay(),
      categoryPriceMultiplier: this.getCategoryMultiplier(),
      minDurationDays: 1,
      maxDurationDays: 30,
      ranking:
        'Sponsored products are ranked first; equal boosts use deterministic daily rotation.',
    };
  }

  async createOrder(sellerId: number, dto: CreateBoostOrderDto) {
    if (!(await this.sellerKycService.isSellerKycApproved(sellerId))) {
      throw new BusinessException(ERROR_CODES.BOOST.PRODUCT_NOT_ELIGIBLE);
    }

    return this.transactionService.execute(async (manager) => {
      const requestedProductIds = dto.items.map((item) => item.productId);
      if (new Set(requestedProductIds).size !== requestedProductIds.length) {
        throw new BusinessException(ERROR_CODES.BOOST.PRODUCT_NOT_ELIGIBLE);
      }

      const requestedByProductId = new Map(dto.items.map((item) => [item.productId, item]));
      const lines: Array<{
        productId: number;
        categoryId: number;
        targetType: BoostTargetType;
        durationDays: number;
        lineAmount: number;
      }> = [];

      // A stable lock order prevents deadlocks when two checkout requests contain
      // overlapping products in a different client-provided order.
      for (const productId of [...requestedProductIds].sort((a, b) => a - b)) {
        const item = requestedByProductId.get(productId)!;
        const product = await this.productRepository.findBoostEligibilityForUpdate(
          productId,
          manager
        );
        if (
          !product ||
          Number(product.sellerId) !== Number(sellerId) ||
          product.status !== ProductStatus.APPROVED
        ) {
          throw new BusinessException(ERROR_CODES.BOOST.PRODUCT_NOT_ELIGIBLE);
        }

        if (await this.boostRepository.hasPendingOrActiveBoost(sellerId, productId, manager)) {
          throw new BusinessException(ERROR_CODES.BOOST.CAMPAIGN_ALREADY_EXISTS);
        }

        const multiplier =
          item.targetType === BoostTargetType.CATEGORY ? this.getCategoryMultiplier() : 1;
        lines.push({
          productId: product.id,
          categoryId: product.categoryId,
          targetType: item.targetType,
          durationDays: item.durationDays,
          lineAmount: Number((this.getPricePerDay() * multiplier * item.durationDays).toFixed(2)),
        });
      }

      const amount = Number(lines.reduce((sum, line) => sum + line.lineAmount, 0).toFixed(2));
      const order = await this.boostRepository.createOrder(
        {
          publicId: randomUUID(),
          sellerId,
          amount,
          currency: 'INR',
          status: BoostOrderStatus.PENDING_PAYMENT,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
        manager
      );
      const orderItems = await this.boostRepository.createOrderItems(
        lines.map((line) => ({ ...line, orderId: order.id })),
        manager
      );

      return {
        orderId: order.publicId,
        items: orderItems.map((item) => ({
          productId: item.productId,
          targetType: item.targetType,
          durationDays: item.durationDays,
          amount: Number(item.lineAmount),
        })),
        amount: Number(order.amount),
        currency: order.currency,
        status: order.status,
        expiresAt: order.expiresAt,
      };
    });
  }

  listSellerOrders(sellerId: number) {
    return this.boostRepository.listSellerOrders(sellerId);
  }

  async processPayment(
    dto: BoostPaymentWebhookDto,
    rawBody: Buffer | undefined,
    signature: string | undefined
  ) {
    this.verifyWebhook(rawBody, signature);

    return this.transactionService.execute(async (manager) => {
      const order = await this.boostRepository.findOrderForUpdate(dto.orderId, manager);
      if (!order) throw new BusinessException(ERROR_CODES.BOOST.ORDER_NOT_FOUND);

      if (order.status === BoostOrderStatus.PAID) {
        if (order.paymentId !== dto.paymentId) {
          throw new BusinessException(ERROR_CODES.BOOST.PAYMENT_MISMATCH);
        }
        return { processed: true, idempotent: true };
      }

      if (
        order.status !== BoostOrderStatus.PENDING_PAYMENT ||
        order.expiresAt.getTime() <= Date.now() ||
        Number(order.amount) !== Number(dto.amount) ||
        order.currency !== dto.currency ||
        (await this.boostRepository.paymentIdExists(dto.paymentId, manager))
      ) {
        throw new BusinessException(ERROR_CODES.BOOST.PAYMENT_MISMATCH);
      }

      await this.boostRepository.activatePaidOrder(order, dto.paymentId, manager);
      return { processed: true, idempotent: false };
    });
  }

  private verifyWebhook(rawBody: Buffer | undefined, signature: string | undefined): void {
    const secret = this.appConfigService.get('BOOST_PAYMENT_WEBHOOK_SECRET');
    if (!secret || !rawBody || !signature) {
      throw new BusinessException(ERROR_CODES.BOOST.INVALID_PAYMENT_SIGNATURE);
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');
    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      throw new BusinessException(ERROR_CODES.BOOST.INVALID_PAYMENT_SIGNATURE);
    }
  }

  private getPricePerDay(): number {
    const price = Number(this.appConfigService.get('BOOST_PRICE_PER_DAY'));
    return Number.isFinite(price) && price > 0 ? price : 100;
  }

  private getCategoryMultiplier(): number {
    const multiplier = Number(this.appConfigService.get('BOOST_CATEGORY_PRICE_MULTIPLIER'));
    return Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 2;
  }
}
