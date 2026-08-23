export enum InvoiceStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  // Starting phase of MULTIPLE type invoice
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  // When invoice submitted after scanning
  COMPLETED = 'COMPLETED',
}

export enum InvoiceScanStatus {
  NOT_SCANNED = 'NOT_SCANNED',

  // When session in progress
  IN_PROGRESS = 'IN_PROGRESS',

  // When session cancelled but not submitted
  PARTIALLY_SCANNED = 'PARTIALLY_SCANNED',

  // When invoice submitted
  SCANNED = 'SCANNED',
  FULLY_SCANNED = 'FULLY_SCANNED',
}
