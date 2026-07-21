export enum KycType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  GST = 'GST',
  NAME_MATCH = 'NAME_MATCH',
  BANK = 'BANK',
  UPI = 'UPI',
}

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
