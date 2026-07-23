import { Injectable } from '@nestjs/common';

import { BannerRedirectType } from '../enum/banner-redirect-type.enum';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class BannerHelper {
  validateRedirectValue(
    redirectType?: BannerRedirectType,
    redirectValue?: string,
  ): void {
    const type = redirectType ?? BannerRedirectType.NONE;

    if (type === BannerRedirectType.NONE) {
      return;
    }

    if (!redirectValue) {
      throw new BusinessException(ERROR_CODES.BANNER.REDIRECT_VALUE_REQUIRED);
    }

    if (type === BannerRedirectType.URL && !this.isValidUrl(redirectValue)) {
      throw new BusinessException(ERROR_CODES.BANNER.INVALID_REDIRECT_URL);
    }
  }

  normalizeRedirectValue(
    redirectType?: BannerRedirectType,
    redirectValue?: string,
  ): string | null {
    if (!redirectType || redirectType === BannerRedirectType.NONE) {
      return null;
    }

    return redirectValue ?? null;
  }

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
}