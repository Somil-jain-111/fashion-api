import {
  KycStatus,
  KycType,
  SellerKycOverallStatus,
  SellerKycStatus,
} from 'src/default/common/enums/kyc.enum';
import {
  SellerOnboardingAudit,
  SellerReviewIssue,
  SellerReviewSection,
} from 'src/modules/sellers/entities';
import { AdminKycListItem } from '../repository/kyc-verification.repository';

export class GenerateAadhaarOtpResponseDto {
  referenceId!: string;
  referenceIdOtp!: string | null;
  maskedAadhaar!: string;
  metadata!: {
    aadharFrontImage: string;
    aadharBackImage: string;
    shareCode: string;
  };
}

export class VerifyAadhaarOtpResponseDto {
  verified!: boolean;
  referenceId!: string;
  message!: string;
}

export class VerifyPanResponseDto {
  verified!: boolean;
  matchScore!: number;
}

export class VerifyGstResponseDto {
  verified!: boolean;
  tradeName?: string | null;
  legalName?: string | null;
  address?: unknown;
  status?: string | null;
  dateOfRegistration?: string | null;
}

export class KycTypeStatusResponseDto {
  verified!: boolean;
  verifiedAt!: Date | null;
}

export class KycCorrectionResponseDto {
  section!: SellerReviewSection;
  remark!: string;
  reviewCycle!: number;
  requestedAt!: Date;
}

export class SellerKycProfileResponseDto {
  pan!: KycTypeStatusResponseDto;
  gst!: KycTypeStatusResponseDto;
  aadhaar!: KycTypeStatusResponseDto;
  status!: SellerKycOverallStatus;
  kycApproved!: boolean;
  override!: {
    status: SellerKycStatus;
    reason: string | null;
    reviewedAt: Date;
  } | null;
  correctionRequests!: KycCorrectionResponseDto[];
}

export class SellerVerificationDocumentResponseDto {
  type!: string;
  label!: string;
  maskedNumber!: string;
  status!: string;
  verifiedAt!: string;
}

export class SellerKycDashboardResponseDto {
  status!: string;
  kycApproved!: string;
  approvedAt!: string;
  documents!: SellerVerificationDocumentResponseDto[];
  bankDetails!: {
    bankName: string;
    maskedAccountNumber: string;
    status: string;
  };
  agreement!: {
    version: string;
    signedAt: string;
    status: string;
  };
  businessInformation!: {
    businessName: string;
    businessType: string;
    businessAddress: string;
    gstState: string;
  };
  pendingUpdateRequest!: {
    id: string;
    section: string;
    reason: string;
    status: string;
    requestedAt: string;
  } | null;
}

export class SellerKycUpdateRequestResponseDto {
  requestId!: string;
  section!: string;
  status!: string;
  requestedAt!: string;
}

export class AdminKycListResponseDto {
  items!: AdminKycListItem[];
  pagination!: {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

export class AdminKycVerificationResponseDto {
  type!: KycType;
  status!: KycStatus;
  maskedDocumentNumber!: string | null;
  verifiedName!: string | null;
  provider!: string | null;
  verifiedAt!: Date;
}

export class AdminKycDetailResponseDto {
  sellerId!: number;
  name!: string | null;
  email!: string | null;
  businessName!: string | null;
  verifications!: AdminKycVerificationResponseDto[];
  override!: {
    status: SellerKycStatus;
    reason: string | null;
    reviewedBy: number;
    reviewedAt: Date;
  } | null;
  correctionRequests!: SellerReviewIssue[];
  audit!: SellerOnboardingAudit[];
}
