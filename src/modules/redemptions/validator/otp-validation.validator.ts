// src/modules/redemptions/validators/redemption-otp.validator.ts

import { Injectable } from '@nestjs/common';
import { DateHelper } from 'src/default/common/helper/date.helper';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { Order } from '../entities/order.entity';

@Injectable()
export class RedemptionOtpValidator {
  validate(order: Order, otp: string): void {
    if (!otp) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_REQUIRED);
    }

    if (!order.redemption_otp) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_NOT_FOUND);
    }

    if (!order.redemption_otp_expired_at) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_EXPIRED);
    }

    if (DateHelper.isOtpExpired(order.redemption_otp_expired_at)) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_EXPIRED);
    }

    if (String(order.redemption_otp) !== String(otp)) {
      throw new BusinessException(ERROR_CODES.OTP.INVALID_OTP);
    }
  }
}
