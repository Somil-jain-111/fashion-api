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

export enum BeneficiaryRelationshipType {
  SELF = 'SELF',
  SPOUSE = 'SPOUSE',
  FATHER_OR_MOTHER = 'FATHER_OR_MOTHER',
  SON_OR_DAUGHTER = 'SON_OR_DAUGHTER',
  BROTHER_OR_SISTER = 'BROTHER_OR_SISTER',
  BUSINESS_PARTNER = 'BUSINESS_PARTNER',
  SHOP_STAFF_OR_EMPLOYEE = 'SHOP_STAFF_OR_EMPLOYEE',
  OTHER = 'OTHER',
}
