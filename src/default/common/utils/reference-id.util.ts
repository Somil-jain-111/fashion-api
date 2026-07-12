// src/default/common/utils/reference-id.util.ts

import { randomBytes } from 'crypto';

export class ReferenceIdUtil {
  static generateKycReferenceId(type: 'AADHAAR' | 'PAN' | 'GST' | 'NAME_MATCH'): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex').toUpperCase();

    return `KYC_${type}_${timestamp}_${random}`;
  }
}
