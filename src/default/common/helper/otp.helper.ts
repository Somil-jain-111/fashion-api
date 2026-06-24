import { OTP_LENGTH } from "src/modules/auth/constants/auth.constants";

export class OtpHelper {
  static generateOtp(length = OTP_LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;

    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  static maskMobile(
    mobile: string | number | bigint | null | undefined,
  ): string | null {
    if (!mobile) {
      return null;
    }

    const mobileString = mobile.toString();

    if (mobileString.length <= 4) {
      return mobileString;
    }

    const firstTwo = mobileString.slice(0, 2);
    const lastTwo = mobileString.slice(-2);
    const masked = "*".repeat(mobileString.length - 4);

    return `${firstTwo}${masked}${lastTwo}`;
  }

  static isOtpExpired(expiryDate?: Date | null): boolean {
    if (!expiryDate) {
      return true;
    }

    return new Date() > new Date(expiryDate);
  }
}