export enum KycType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  GST = 'GST',
  NAME_MATCH = 'NAME_MATCH',
  BANK = 'BANK',
  UPI = 'UPI',
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
}

export enum BeneficiaryType {
  BANK = 'BANK',
  UPI = 'UPI',
}
