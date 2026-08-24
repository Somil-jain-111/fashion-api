import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

export interface ResolvedIdentifier {
  type: 'mobile' | 'email';
  value: string;
}

export class IdentifierHelper {
  /**
   * Requires exactly one of mobile/email so a request can't be routed to
   * one channel while silently carrying an unverified second identifier.
   */
  static resolve(dto: { mobile?: string; email?: string }): ResolvedIdentifier {
    if (dto.mobile && dto.email) {
      throw new BusinessException(ERROR_CODES.AUTH.MOBILE_OR_EMAIL_REQUIRED);
    }

    if (dto.mobile) {
      return { type: 'mobile', value: dto.mobile };
    }

    if (dto.email) {
      return { type: 'email', value: dto.email };
    }

    throw new BusinessException(ERROR_CODES.AUTH.MOBILE_OR_EMAIL_REQUIRED);
  }
}
