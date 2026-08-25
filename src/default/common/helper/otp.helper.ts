import { randomInt } from 'crypto';
import { OTP_LENGTH } from 'src/modules/auth/constants/auth.constants';

export class OtpHelper {
  /** crypto.randomInt is a CSPRNG — Math.random() is not suitable for a security credential. */
  static generateOtp(length = OTP_LENGTH): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;

    return randomInt(min, max + 1).toString();
  }

  static maskMobile(mobile: string | number | bigint | null | undefined): string | null {
    if (!mobile) {
      return null;
    }

    const mobileString = mobile.toString();

    if (mobileString.length <= 4) {
      return mobileString;
    }

    const firstTwo = mobileString.slice(0, 2);
    const lastTwo = mobileString.slice(-2);
    const masked = '*'.repeat(mobileString.length - 4);

    return `${firstTwo}${masked}${lastTwo}`;
  }

  static maskEmail(email: string | null | undefined): string | null {
    if (!email) {
      return null;
    }

    const [local, domain] = email.split('@');

    if (!domain) {
      return email;
    }

    const visible = local.slice(0, 2);
    const masked = '*'.repeat(Math.max(local.length - 2, 1));

    return `${visible}${masked}@${domain}`;
  }

  static isOtpExpired(expiryDate?: Date | null): boolean {
    if (!expiryDate) {
      return true;
    }

    return new Date() > new Date(expiryDate);
  }

  static generateExpiryDate(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}
