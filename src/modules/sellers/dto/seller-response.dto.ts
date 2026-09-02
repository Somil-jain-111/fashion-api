export class SellerOnboardResponseDto {
  sellerId!: string;
  storeName!: string;
}

export class SellerRequirementsResponseDto {
  sequence!: string[];
  businessTypes!: string[];
  businessProfileFields!: string[];
  conditionalFields!: { gstinNumber: string };
  bankFields!: string[];
  requiredKyc!: {
    INDIVIDUAL: string[];
    NON_INDIVIDUAL: string[];
  };
  gstRequiredWhen!: string;
  agreementVersion!: string;
  reviewSections!: string[];
}

export class SellerCorrectionRequestResponseDto {
  section!: string;
  remark!: string;
  reviewCycle!: string;
  requestedAt!: string;
}

export class SellerProfileResponseDto {
  sellerId!: string;
  businessName!: string;
  businessType!: string;
  address!: {
    streetAddress: string;
    city: string;
    state: string;
    pincode: string;
  };
  contact!: {
    name: string;
    email: string;
    phone: string;
  };
  hasGstin!: string;
  agreementAcceptedAt!: string;
  bankDetailsCompleted!: string;
  signedAt!: string;
  verifiedKyc!: string[];
  onboardingStatus!: string;
  correctionRequests!: SellerCorrectionRequestResponseDto[];
}

export class SellerProfileSubmissionResponseDto {
  sellerId!: string;
  nextStep?: string;
  correctionSubmitted?: string;
}

export class SellerAgreementResponseDto {
  accepted!: string;
  nextStep!: string;
}

export class SellerBankDetailsResponseDto {
  saved!: string;
  nextStep?: string;
  correctionSubmitted?: string;
}

export class SellerEsignResponseDto {
  completed!: string;
  status?: string;
  correctionSubmitted?: string;
}
