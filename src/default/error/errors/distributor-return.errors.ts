export const DISTRIBUTOR_RETURN_ERRORS = {
  INVOICE_NOT_FOUND: {
    code: 'DRT_001',
    message: 'Invoice not found for this distributor',
    statusCode: 404,
  },
  PAIR_NOT_FOUND: {
    code: 'DRT_002',
    message: 'Pair QR does not belong to this invoice',
    statusCode: 404,
  },
  PAIR_NOT_ELIGIBLE: {
    code: 'DRT_003',
    message: 'Pair has not been redeemed and cannot be returned',
    statusCode: 422,
  },
  PAIR_ALREADY_RETURNED: {
    code: 'DRT_004',
    message: 'This pair has already been returned',
    statusCode: 409,
  },
  RETAILER_NOT_FOUND: {
    code: 'DRT_005',
    message: 'Retailer for this invoice was not found',
    statusCode: 404,
  },
} as const;
