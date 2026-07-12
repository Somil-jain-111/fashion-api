export const COUPON_ERRORS = {
  COUPON_NOT_FOUND: {
    code: 'CPN_001',
    message: 'Coupon not found',
    statusCode: 404,
  },
  COUPON_ALREADY_REDEEMED: {
    code: 'CPN_002',
    message: 'Coupon already redeemed',
    statusCode: 400,
  },
  COUPON_EXPIRED: {
    code: 'CPN_003',
    message: 'Coupon expired',
    statusCode: 400,
  },
  INVALID_COUPON: {
    code: 'CPN_004',
    message: 'Invalid coupon',
    statusCode: 400,
  },
  COUPON_NOT_APPLICABLE: {
    code: 'CPN_005',
    message: 'Coupon is not applicable',
    statusCode: 400,
  },
} as const;
