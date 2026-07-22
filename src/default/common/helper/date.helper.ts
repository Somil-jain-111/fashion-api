import {
  OTP_EXPIRY_MINUTES,
  REFRESH_TOKEN_EXPIRY_DAYS,
  RESET_TOKEN_EXPIRY_MINUTES,
} from 'src/modules/auth/constants/auth.constants';

export class DateHelper {
  static getOtpExpiryDate(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
    return expiry;
  }

  static getRefreshTokenExpiryDate(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return expiry;
  }

  static getResetTokenExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + RESET_TOKEN_EXPIRY_MINUTES);
    return expiryDate;
  }

  static isOtpExpired(expiryDate?: Date): Boolean {
    if (!expiryDate) {
      return true;
    }

    const realTime = expiryDate.getTime() - expiryDate.getTimezoneOffset() * 60 * 1000;
    return Date.now() > realTime;
  }
}
