// src/modules/redemptions/builders/redemption-provider-payload.builder.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class RedemptionProviderPayloadBuilder {
  constructor(private readonly configService: ConfigService) {}

  build(user: any, order: any, shippingDetail?: any) {
    const catalogueId =
      this.configService.get('NODE_ENV') === 'production'
        ? this.configService.get('REWARDS_CATALOGUE_ID_LIVE')
        : this.configService.get('REWARDS_CATALOGUE_ID_DEV');

    if (!catalogueId) {
      throw new BusinessException(ERROR_CODES.REWARDS.CATALOGUE_ID_NOT_FOUND);
    }

    const basePayload = {
      catalogue_id: catalogueId,
      apc: order.product_sku,
      price_type: 'points',
      amount: Number(order.total_points),
      quantity: Number(order.quantity || 1),
      transaction_id: order.transaction_id,
      order_id: Number(order.id),
      orderDate: new Date().toISOString(),
    };

    if (order.order_type === 'physical') {
      if (!shippingDetail) {
        throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_DETAIL_NOT_FOUND);
      }

      if (!shippingDetail.mobile) {
        throw new BusinessException(ERROR_CODES.SHIPPING.SHIPPING_MOBILE_REQUIRED);
      }

      return {
        ...basePayload,
        msisdn: String(shippingDetail.mobile),
        address: shippingDetail.addressLine1 || '',
        town: shippingDetail.cityName || '',
        city: shippingDetail.cityName || '',
        state: shippingDetail.stateName || '',
        pincode: String(shippingDetail.pincode || ''),
        user_name: user.username || '',
      };
    }

    return {
      ...basePayload,
      msisdn: String(user.mobile),
    };
  }
}
