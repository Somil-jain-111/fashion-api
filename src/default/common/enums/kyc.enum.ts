export enum KycType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  GST = 'GST',
  NAME_MATCH = 'NAME_MATCH',
  BANK = 'BANK',
  UPI = 'UPI',
  BENE_PAN = 'BENE_PAN',
  BENE_AADHAAR = 'BENE_AADHAAR',
}

export const KycTypeFiltered = {
  AADHAAR: KycType.AADHAAR,
  PAN: KycType.PAN,
  GST: KycType.GST,
} as const;

export type KycTypeFiltered = (typeof KycTypeFiltered)[keyof typeof KycTypeFiltered];

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
}

export enum KycLogStatus {
  OTP_SENT = 'OTP_SENT',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  SUBMITTED = 'SUBMITTED',
}

/**
 * Status of a Super Admin's manual override on a seller's overall KYC —
 * distinct from KycStatus (per-type auto-verification result). A seller with
 * no override row falls back to the automatic all-three-VERIFIED computation.
 */
export enum SellerKycStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
