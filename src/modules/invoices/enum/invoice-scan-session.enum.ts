export enum InvoiceType {
  SINGLE = 'SINGLE',
  MULTIPLE = 'MULTIPLE',
}

export enum ScanSessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PairHistoryStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  REWARDED = 'REWARDED',
}

export enum InvoiceHistoryStatus {
  STARTED = 'STARTED',
  PARTIALLY_SUBMITTED = 'PARTIALLY_SUBMITTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ScanSource {
  SINGLE = 'SINGLE',
  BULK = 'BULK',
}
