export enum InvoicePairScanStatus {
  UNSCANNED = 'UNSCANNED',
  SCANNED = 'SCANNED',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
  REDEEMED = 'REDEEMED',
  USED = 'USED',
  /**
   * Sub-distributor equivalent of REDEEMED — committed into the sub-distributor's own
   * stock ledger rather than rewarded with points. Deliberately excluded from
   * distributor-return/customer-return's REDEEMED-only eligibility checks: stock still
   * sitting with a sub-distributor was never sold to an end customer.
   */
  STOCKED = 'STOCKED',
}
