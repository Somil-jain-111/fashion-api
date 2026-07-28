export const INVOICE_SCAN_ERRORS = {
  INVOICE_NOT_FOUND: { code: 'ISC_001', message: 'Invoice not found', statusCode: 404 },
  INVOICE_INACTIVE: { code: 'ISC_002', message: 'Invoice is not active', statusCode: 422 },
  INVOICE_EXPIRED: { code: 'ISC_003', message: 'Invoice has expired', statusCode: 422 },
  SESSION_NOT_FOUND: { code: 'ISC_004', message: 'Scan session not found', statusCode: 404 },
  SESSION_NOT_ACTIVE: { code: 'ISC_005', message: 'Scan session is not active', statusCode: 409 },
  PAIR_NOT_FOUND: { code: 'ISC_006', message: 'Pair QR not found', statusCode: 404 },
  PAIR_NOT_IN_INVOICE: {
    code: 'ISC_007',
    message: 'Pair QR does not belong to this invoice',
    statusCode: 422,
  },
  DUPLICATE_PAIR: { code: 'ISC_008', message: 'Pair QR has already been scanned', statusCode: 409 },
  PAIR_UNAVAILABLE: {
    code: 'ISC_009',
    message: 'Pair QR is already used or redeemed',
    statusCode: 409,
  },
  LOCK_UNAVAILABLE: {
    code: 'ISC_010',
    message: 'The invoice is being processed. Please retry.',
    statusCode: 409,
  },
  NO_VALID_PAIRS: { code: 'ISC_011', message: 'No new valid pairs to submit', statusCode: 422 },
  SINGLE_INVOICE_INCOMPLETE: {
    code: 'ISC_012',
    message: 'All expected pairs must be scanned before submitting a single invoice',
    statusCode: 422,
  },
} as const;
