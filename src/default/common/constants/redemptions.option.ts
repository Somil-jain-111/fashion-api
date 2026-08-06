import { KycType } from '../enums/kyc.enum';
import { UserPartnerType } from '../enums/user-type.enum';

export const RedemptionKYCRequirements = {
  [UserPartnerType.INDIVIDUAL]: [KycType.PAN, KycType.AADHAAR],
  [UserPartnerType.ENTITY]: [KycType.PAN, KycType.GST],
};
