// src/modules/redemptions/handlers/redemption-provider-response.handler.ts

import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { TransactionService } from 'src/default/databases/transaction';
import { OrderStatus, ShippingStatus } from '../enum/order-status.enum';
import {
  OrderRepository,
  VoucherRepository,
  ShippingDetailRepository,
} from 'src/modules/redemptions/repository';
import { QueryRunner } from 'typeorm';

type HandleProviderResponseParams = {
  user: any;
  order: any;
  shippingDetail?: any;
  providerResponse: any;
};

@Injectable()
export class RedemptionProviderResponseHandler {
  constructor(
    private readonly transactionUtils: TransactionService,
    private readonly orderRepository: OrderRepository,
    private readonly shippingDetailRepository: ShippingDetailRepository,
    private readonly voucherRepository: VoucherRepository
  ) {}

  async handle(params: HandleProviderResponseParams, queryRunner?: QueryRunner) {
    const { user, order, shippingDetail, providerResponse } = params;

    let couponResponse: any = null;

    const callback = async (queryRunner: QueryRunner) => {
      /**
       * Duplicate transaction
       */
      if (providerResponse?.message === 'Transaction id already exist') {
        throw new BusinessException(ERROR_CODES.ORDER.ORDER_ALREADY_PLACED);
      }

      /**
       * Provider failed
       */
      if (providerResponse?.statusCode !== 200) {
        await this.shippingDetailRepository.update(
          { order_id: order.id },
          {
            status: ShippingStatus.PROCESSING,
            errorMessage:
              providerResponse?.message ||
              providerResponse?.data?.message ||
              'Provider order failed',
          },
          queryRunner
        );

        return;
      }

      /**
       * Physical order success
       */
      if (order.order_type === 'physical') {
        if (!shippingDetail) {
          throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_DETAIL_NOT_FOUND);
        }

        await this.orderRepository.update(
          { id: order.id },
          {
            order_number: providerResponse.data?.order_number || '',
            status: OrderStatus.PLACED,
          },
          queryRunner
        );

        await this.shippingDetailRepository.update(
          { id: shippingDetail.id },
          {
            delivery_status: ShippingStatus.PLACED,
          },
          queryRunner
        );

        return;
      }

      /**
       * Digital order success
       */
      if (order.order_type === 'digital') {
        await this.orderRepository.update(
          { id: order.id },
          {
            order_number: providerResponse.data?.order_number || '',
            status: OrderStatus.PLACED,
          },
          queryRunner
        );

        const coupon = providerResponse.data?.coupon_Codes?.[0];

        if (coupon) {
          const voucherObj = this.voucherRepository.create(
            {
              coupon_code: coupon.coupon_code,
              v_pin: coupon.v_pin,
              expiry_date: coupon.expiry_date,
              order: { id: order.id } as any,
            },
            queryRunner
          );

          const savedVoucher = await this.voucherRepository.save(voucherObj, queryRunner);

          couponResponse = {
            coupon_code: savedVoucher.coupon_code,
            v_pin: savedVoucher.v_pin,
            expiry_date: savedVoucher.expiry_date,
          };
        }
      }
    };

    if (queryRunner) {
      await callback(queryRunner);
      return couponResponse;
    }

    await this.transactionUtils.runInTransaction(callback);

    return couponResponse;
  }
}
