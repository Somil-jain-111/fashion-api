// src/modules/redemptions/validators/redemption-otp.validator.ts

import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class RedemptionOtpValidator {
  validate(order: any, otp: string): void {
    if (!otp) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_REQUIRED);
    }

    if (!order.redemption_otp) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_NOT_FOUND);
    }

    if (!order.redemption_otp_expired_at) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_EXPIRED);
    }

    const expiryTime = new Date(order.redemption_otp_expired_at).getTime();

    if (expiryTime < Date.now()) {
      throw new BusinessException(ERROR_CODES.OTP.OTP_EXPIRED);
    }

    if (String(order.redemption_otp) !== String(otp)) {
      throw new BusinessException(ERROR_CODES.OTP.INVALID_OTP);
    }
  }
}
