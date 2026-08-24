export const SELLER_ERRORS = {
  SELLER_ALREADY_REGISTERED: {
    code: 'SEL_001',
    message: 'This account is already registered as a seller',
    statusCode: 400,
  },
  SELLER_NOT_FOUND: {
    code: 'SEL_002',
    message: 'Seller profile not found',
    statusCode: 404,
  },
  SELLER_STORE_SLUG_TAKEN: {
    code: 'SEL_003',
    message: 'Store name is already taken, please choose another',
    statusCode: 400,
  },
  KYC_DOCUMENT_NOT_FOUND: {
    code: 'SEL_004',
    message: 'KYC document not found',
    statusCode: 404,
  },
  KYC_REJECTION_REASON_REQUIRED: {
    code: 'SEL_005',
    message: 'A rejection reason is required when rejecting a KYC document',
    statusCode: 400,
  },
  KYC_DOCUMENT_ALREADY_REVIEWED: {
    code: 'SEL_006',
    message: 'This KYC document has already been reviewed',
    statusCode: 400,
  },
  KYC_NOT_APPROVED: {
    code: 'SEL_007',
    message: 'Seller KYC has not been approved yet',
    statusCode: 403,
  },
} as const;
