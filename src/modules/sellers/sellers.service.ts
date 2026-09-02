import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { UserRepository, RolesRepository } from '../auth/repository';
import {
  SellerReviewRepository,
  SellerUpdateRequestRepository,
  StoreInformationRepository,
} from './repository';
import { OnboardSellerDto } from './dto';
import {
  AcceptSellerAgreementDto,
  CompleteEsignDto,
  CreateSellerProfileDto,
  SaveBankDetailsDto,
  SellerAgreementResponseDto,
  SellerBankDetailsResponseDto,
  SellerEsignResponseDto,
  SellerOnboardResponseDto,
  SellerProfileResponseDto,
  SellerProfileSubmissionResponseDto,
  SellerRequirementsResponseDto,
} from './dto';
import { KycEncryptionHelper } from 'src/default/common/helper/kyc-encryption.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { KycType } from 'src/default/common/enums/kyc.enum';
import {
  SellerBusinessType,
  SellerOnboardingStatus,
  SellerReviewSection,
  StoreInformation,
} from './entities';
import { EntityManager } from 'typeorm';
import { TransactionService } from 'src/default/databases/transaction';

const CURRENT_SELLER_AGREEMENT_VERSION = '2026-01';

@Injectable()
export class SellersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly storeInformationRepository: StoreInformationRepository,
    private readonly appConfigService: AppConfigService,
    private readonly sellerReviewRepository: SellerReviewRepository,
    private readonly sellerUpdateRequestRepository: SellerUpdateRequestRepository,
    private readonly transactionService: TransactionService
  ) {}

  async getVerificationDashboardData(userId: number) {
    const [profile, pendingUpdateRequest] = await Promise.all([
      this.storeInformationRepository.findVerificationDashboardBySellerId(userId),
      this.sellerUpdateRequestRepository.findPending(userId),
    ]);
    if (!profile) throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);

    let accountNumber = '';
    if (profile.bankAccountNumber) {
      accountNumber = String(this.decrypt(profile.bankAccountNumber));
    }

    return {
      profile,
      maskedAccountNumber: accountNumber ? `••••${accountNumber.slice(-4)}` : '',
      pendingUpdateRequest,
    };
  }

  async requestKycUpdate(userId: number, section: SellerReviewSection, reason: string) {
    const profile = await this.getSellerProfile(userId);
    if (profile.onboardingStatus !== SellerOnboardingStatus.APPROVED) {
      throw new BusinessException(ERROR_CODES.SELLER.ONBOARDING_STEP_OUT_OF_ORDER);
    }
    const existing = await this.sellerUpdateRequestRepository.findPending(userId, section);
    if (existing) throw new BusinessException(ERROR_CODES.VALIDATION.INVALID_PAYLOAD);
    return this.sellerUpdateRequestRepository.create(userId, section, reason.trim());
  }

  /**
   * Adds seller capability to an already-logged-in account without touching
   * whatever roles it already has (a customer stays a customer too). PAN/GST/Aadhaar
   * verification happens afterward via the existing /sellers/kyc/* endpoints — this
   * endpoint only captures the store name and grants the role.
   */
  async onboard(userId: number, dto: OnboardSellerDto): Promise<SellerOnboardResponseDto> {
    const isAlreadySeller = await this.userRepository.hasRole(userId, UserRole.SELLER_ADMIN);

    if (isAlreadySeller) {
      throw new BusinessException(ERROR_CODES.SELLER.SELLER_ALREADY_REGISTERED);
    }

    const sellerRole = await this.rolesRepository.findByName(UserRole.SELLER_ADMIN);

    if (!sellerRole) {
      throw new BusinessException(ERROR_CODES.ROLE.ROLE_NOT_FOUND);
    }

    const storeInformation = await this.storeInformationRepository.save({
      sellerId: userId,
      storeName: dto.storeName,
    });

    await this.userRepository.addRole(userId, sellerRole.id);

    return {
      sellerId: String(userId),
      storeName: storeInformation.storeName,
    };
  }

  getRequirements(): SellerRequirementsResponseDto {
    return {
      sequence: ['BUSINESS_PROFILE', 'AGREEMENT', 'KYC', 'BANK_DETAILS', 'ESIGN', 'APPROVAL'],
      businessTypes: Object.values(SellerBusinessType).map(String),
      businessProfileFields: [
        'businessName',
        'businessType',
        'panNumber',
        'streetAddress',
        'city',
        'state',
        'pincode',
        'contactName',
        'contactEmail',
        'contactPhone',
      ],
      conditionalFields: { gstinNumber: 'required when businessType is not INDIVIDUAL' },
      bankFields: [
        'accountHolderName',
        'accountNumber',
        'ifscCode',
        'bankName',
        'branch',
        'bankState',
        'cancelledChequeUrl',
      ],
      requiredKyc: {
        INDIVIDUAL: [KycType.PAN, KycType.AADHAAR].map(String),
        NON_INDIVIDUAL: [KycType.PAN, KycType.AADHAAR, KycType.GST].map(String),
      },
      gstRequiredWhen: 'businessType is not INDIVIDUAL',
      agreementVersion: CURRENT_SELLER_AGREEMENT_VERSION,
      reviewSections: Object.values(SellerReviewSection).map(String),
    };
  }

  async getProfile(userId: number): Promise<SellerProfileResponseDto> {
    const [profile, verifiedKyc, correctionRequests] = await Promise.all([
      this.storeInformationRepository.findProfileSummaryBySellerId(userId),
      this.storeInformationRepository.findVerifiedKycTypes(userId),
      this.sellerReviewRepository.listOpen(userId),
    ]);
    if (!profile) throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);

    return {
      sellerId: String(userId),
      businessName: String(profile.storeName),
      businessType: this.responseString(profile.businessType),
      address: {
        streetAddress: this.responseString(profile.streetAddress),
        city: this.responseString(profile.city),
        state: this.responseString(profile.state),
        pincode: this.responseString(profile.pincode),
      },
      contact: {
        name: this.responseString(profile.contactName),
        email: this.responseString(profile.contactEmail),
        phone: this.responseString(profile.contactPhone),
      },
      hasGstin: String(profile.hasGstin),
      agreementAcceptedAt: this.responseString(profile.agreementAcceptedAt),
      bankDetailsCompleted: String(profile.bankDetailsCompleted),
      signedAt: this.responseString(profile.signedAt),
      verifiedKyc: verifiedKyc.map(String),
      onboardingStatus: String(profile.onboardingStatus),
      correctionRequests: correctionRequests.map((issue) => ({
        section: String(issue.section),
        remark: String(issue.remark),
        reviewCycle: String(issue.reviewCycle),
        requestedAt: this.responseString(issue.createdAt),
      })),
    };
  }

  async createProfile(
    userId: number,
    dto: CreateSellerProfileDto
  ): Promise<SellerProfileSubmissionResponseDto> {
    const profile = await this.getSellerProfile(userId);

    if (profile.businessType) {
      if (
        profile.onboardingStatus !== SellerOnboardingStatus.REJECTED ||
        !(await this.sellerReviewRepository.isOpen(userId, SellerReviewSection.PROFILE))
      ) {
        throw new BusinessException(ERROR_CODES.SELLER.PROFILE_ALREADY_COMPLETED);
      }

      await this.transactionService.execute(async (manager) => {
        await this.storeInformationRepository.updateBySellerId(
          userId,
          this.profilePayload(dto),
          manager
        );
        await this.resolveReviewIssue(userId, SellerReviewSection.PROFILE, manager);
      });
      return { sellerId: String(userId), correctionSubmitted: 'true' };
    }

    const created = await this.storeInformationRepository.updateIncompleteProfile(userId, {
      ...this.profilePayload(dto),
      onboardingStatus: SellerOnboardingStatus.AGREEMENT_PENDING,
    });

    if (!created) {
      throw new BusinessException(ERROR_CODES.SELLER.PROFILE_ALREADY_COMPLETED);
    }

    return { sellerId: String(userId), nextStep: String(SellerOnboardingStatus.AGREEMENT_PENDING) };
  }

  async acceptAgreement(
    userId: number,
    dto: AcceptSellerAgreementDto,
    req: { ip?: string; headers?: Record<string, unknown> }
  ): Promise<SellerAgreementResponseDto> {
    const profile = await this.requireStatus(userId, SellerOnboardingStatus.AGREEMENT_PENDING);

    if (!profile.businessType || dto.accepted !== true) {
      throw new BusinessException(ERROR_CODES.SELLER.AGREEMENT_NOT_ACCEPTED);
    }

    if (dto.agreementVersion !== CURRENT_SELLER_AGREEMENT_VERSION) {
      throw new BusinessException(ERROR_CODES.SELLER.INVALID_AGREEMENT_VERSION);
    }

    const forwardedFor = req?.headers?.['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.toString().split(',')[0].trim() || req?.ip || null;

    await this.transitionOrThrow(
      userId,
      SellerOnboardingStatus.AGREEMENT_PENDING,
      SellerOnboardingStatus.KYC_PENDING,
      {
        agreementVersion: dto.agreementVersion,
        agreementAcceptedAt: new Date(),
        agreementIp: ip,
      }
    );

    return { accepted: 'true', nextStep: String(SellerOnboardingStatus.KYC_PENDING) };
  }

  async saveBankDetails(
    userId: number,
    dto: SaveBankDetailsDto
  ): Promise<SellerBankDetailsResponseDto> {
    const workflow = await this.getSellerProfile(userId);
    if (
      workflow.onboardingStatus === SellerOnboardingStatus.REJECTED &&
      (await this.sellerReviewRepository.isOpen(userId, SellerReviewSection.BANK_DETAILS))
    ) {
      await this.transactionService.execute(async (manager) => {
        await this.storeInformationRepository.updateBySellerId(
          userId,
          this.bankPayload(dto),
          manager
        );
        await this.resolveReviewIssue(userId, SellerReviewSection.BANK_DETAILS, manager);
      });
      return { saved: 'true', correctionSubmitted: 'true' };
    }

    await this.assertKycComplete(userId, SellerOnboardingStatus.BANK_DETAILS_PENDING);

    await this.transitionOrThrow(
      userId,
      SellerOnboardingStatus.BANK_DETAILS_PENDING,
      SellerOnboardingStatus.ESIGN_PENDING,
      this.bankPayload(dto)
    );

    return { saved: 'true', nextStep: String(SellerOnboardingStatus.ESIGN_PENDING) };
  }

  async completeEsign(userId: number, dto: CompleteEsignDto): Promise<SellerEsignResponseDto> {
    const workflow = await this.getSellerProfile(userId);
    if (
      workflow.onboardingStatus === SellerOnboardingStatus.REJECTED &&
      (await this.sellerReviewRepository.isOpen(userId, SellerReviewSection.ESIGN))
    ) {
      await this.transactionService.execute(async (manager) => {
        await this.storeInformationRepository.updateBySellerId(
          userId,
          this.esignPayload(dto),
          manager
        );
        await this.resolveReviewIssue(userId, SellerReviewSection.ESIGN, manager);
      });
      return { completed: 'true', correctionSubmitted: 'true' };
    }

    const profile = await this.requireStatus(userId, SellerOnboardingStatus.ESIGN_PENDING);

    if (!profile.bankDetailsCompleted) {
      throw new BusinessException(ERROR_CODES.SELLER.BANK_DETAILS_INCOMPLETE);
    }

    await this.transitionOrThrow(
      userId,
      SellerOnboardingStatus.ESIGN_PENDING,
      SellerOnboardingStatus.PENDING_APPROVAL,
      {
        signatureUrl: this.encrypt(dto.signatureUrl),
        esignDocumentId: dto.documentId,
        signedAt: new Date(),
      }
    );

    return { completed: 'true', status: String(SellerOnboardingStatus.PENDING_APPROVAL) };
  }

  async markKycCompleteIfEligible(userId: number): Promise<void> {
    const profile = await this.getSellerProfile(userId);
    if (profile.onboardingStatus !== SellerOnboardingStatus.KYC_PENDING) return;

    const verified = await this.storeInformationRepository.findVerifiedKycTypes(userId);
    const required = this.requiredKyc(profile.businessType);
    if (required.every((type) => verified.includes(type))) {
      await this.storeInformationRepository.transitionStatus(
        userId,
        SellerOnboardingStatus.KYC_PENDING,
        SellerOnboardingStatus.BANK_DETAILS_PENDING
      );
    }
  }

  async assertKycStep(userId: number): Promise<void> {
    await this.requireStatus(userId, SellerOnboardingStatus.KYC_PENDING);
  }

  async assertKycOrCorrectionStep(userId: number, type: KycType): Promise<boolean> {
    const profile = await this.getSellerProfile(userId);
    if (profile.onboardingStatus === SellerOnboardingStatus.KYC_PENDING) return false;
    const section = type as unknown as SellerReviewSection;
    if (
      profile.onboardingStatus === SellerOnboardingStatus.REJECTED &&
      (await this.sellerReviewRepository.isOpen(userId, section))
    )
      return true;
    throw new BusinessException(ERROR_CODES.SELLER.ONBOARDING_STEP_OUT_OF_ORDER);
  }

  async completeKycCorrection(userId: number, type: KycType): Promise<void> {
    const section = type as unknown as SellerReviewSection;
    if (!(await this.sellerReviewRepository.isOpen(userId, section))) return;
    await this.transactionService.execute((manager) =>
      this.resolveReviewIssue(userId, section, manager)
    );
  }

  async createReviewIssues(
    sellerId: number,
    reviewerId: number,
    issues: Array<{ section: SellerReviewSection; remark: string }>,
    manager: EntityManager
  ): Promise<void> {
    await this.sellerReviewRepository.createIssues(sellerId, reviewerId, issues, manager);
    await this.sellerReviewRepository.audit(
      {
        sellerId,
        actorId: reviewerId,
        actorRole: 'SUPERADMIN',
        action: 'SELLER_REJECTED',
        fromStatus: SellerOnboardingStatus.PENDING_APPROVAL,
        toStatus: SellerOnboardingStatus.REJECTED,
        metadata: { issues: issues.map(({ section, remark }) => ({ section, remark })) },
      },
      manager
    );
  }

  async createApprovalAudit(
    sellerId: number,
    reviewerId: number,
    manager: EntityManager
  ): Promise<void> {
    await this.sellerReviewRepository.audit(
      {
        sellerId,
        actorId: reviewerId,
        actorRole: 'SUPERADMIN',
        action: 'SELLER_APPROVED',
        fromStatus: SellerOnboardingStatus.PENDING_APPROVAL,
        toStatus: SellerOnboardingStatus.APPROVED,
      },
      manager
    );
  }

  listAudit(sellerId: number) {
    return this.sellerReviewRepository.listAudit(sellerId);
  }

  listOpenReviewIssues(sellerId: number) {
    return this.sellerReviewRepository.listOpen(sellerId);
  }

  private async resolveReviewIssue(
    sellerId: number,
    section: SellerReviewSection,
    manager: EntityManager
  ): Promise<void> {
    await this.sellerReviewRepository.resolve(sellerId, section, manager);
    const remaining = await this.sellerReviewRepository.countOpen(sellerId, manager);
    const next =
      remaining === 0 ? SellerOnboardingStatus.PENDING_APPROVAL : SellerOnboardingStatus.REJECTED;
    if (remaining === 0) {
      await this.storeInformationRepository.updateBySellerId(
        sellerId,
        { onboardingStatus: next },
        manager
      );
    }
    await this.sellerReviewRepository.audit(
      {
        sellerId,
        actorId: sellerId,
        actorRole: 'SELLER',
        action: remaining === 0 ? 'CORRECTIONS_RESUBMITTED' : 'CORRECTION_RESUBMITTED',
        section,
        fromStatus: SellerOnboardingStatus.REJECTED,
        toStatus: next,
        metadata: { remainingCorrectionCount: remaining },
      },
      manager
    );
  }

  private profilePayload(dto: CreateSellerProfileDto): Partial<StoreInformation> {
    return {
      storeName: dto.businessName,
      businessType: dto.businessType,
      panNumber: this.encrypt(dto.panNumber),
      gstinNumber: dto.gstinNumber ? this.encrypt(dto.gstinNumber) : null,
      streetAddress: dto.streetAddress,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail.toLowerCase(),
      contactPhone: dto.contactPhone,
    };
  }

  private bankPayload(dto: SaveBankDetailsDto): Partial<StoreInformation> {
    return {
      bankAccountHolderName: this.encrypt(dto.accountHolderName),
      bankAccountNumber: this.encrypt(dto.accountNumber),
      bankIfscCode: this.encrypt(dto.ifscCode),
      bankName: dto.bankName,
      bankBranch: dto.branch,
      bankState: dto.bankState,
      cancelledChequeUrl: this.encrypt(dto.cancelledChequeUrl),
    };
  }

  private esignPayload(dto: CompleteEsignDto): Partial<StoreInformation> {
    return {
      signatureUrl: this.encrypt(dto.signatureUrl),
      esignDocumentId: dto.documentId,
      signedAt: new Date(),
    };
  }

  async getRequiredKycTypes(userId: number): Promise<KycType[]> {
    const profile = await this.getSellerProfile(userId);
    return this.requiredKyc(profile.businessType);
  }

  async getOnboardingStatus(userId: number): Promise<SellerOnboardingStatus> {
    return (await this.getSellerProfile(userId)).onboardingStatus;
  }

  async getKycContext(userId: number): Promise<{
    requiredTypes: KycType[];
    onboardingStatus: SellerOnboardingStatus;
  }> {
    const profile = await this.getSellerProfile(userId);
    return {
      requiredTypes: this.requiredKyc(profile.businessType),
      onboardingStatus: profile.onboardingStatus,
    };
  }

  async markApprovalDecision(
    userId: number,
    approved: boolean,
    manager?: EntityManager,
    workflowLocked = false
  ): Promise<void> {
    if (!workflowLocked) await this.assertPendingApproval(userId, manager);
    await this.storeInformationRepository.updateBySellerId(
      userId,
      {
        onboardingStatus: approved
          ? SellerOnboardingStatus.APPROVED
          : SellerOnboardingStatus.REJECTED,
      },
      manager
    );
  }

  async assertPendingApproval(userId: number, manager?: EntityManager): Promise<void> {
    await this.requireStatus(userId, SellerOnboardingStatus.PENDING_APPROVAL, manager, true);
  }

  private async assertKycComplete(userId: number, expectedStatus: SellerOnboardingStatus) {
    await this.markKycCompleteIfEligible(userId);
    const profile = await this.getSellerProfile(userId);
    if (profile.onboardingStatus !== expectedStatus) {
      throw new BusinessException(ERROR_CODES.SELLER.KYC_INCOMPLETE);
    }
  }

  private requiredKyc(businessType?: SellerBusinessType): KycType[] {
    return businessType === SellerBusinessType.INDIVIDUAL
      ? [KycType.PAN, KycType.AADHAAR]
      : [KycType.PAN, KycType.AADHAAR, KycType.GST];
  }

  private async getSellerProfile(userId: number) {
    const profile = await this.storeInformationRepository.findWorkflowBySellerId(userId);
    if (!profile) throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);
    return profile;
  }

  private async requireStatus(
    userId: number,
    expected: SellerOnboardingStatus,
    manager?: EntityManager,
    lockForUpdate = false
  ) {
    const profile = manager
      ? await this.storeInformationRepository.findWorkflowBySellerId(userId, manager, lockForUpdate)
      : await this.getSellerProfile(userId);
    if (!profile) throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);
    if (profile.onboardingStatus !== expected) {
      throw new BusinessException(ERROR_CODES.SELLER.ONBOARDING_STEP_OUT_OF_ORDER);
    }
    return profile;
  }

  private responseString(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  private encrypt(value: string): string {
    return KycEncryptionHelper.encrypt(
      value,
      this.appConfigService.get('KYC_ENCRYPTION_SECRET_KEY'),
      this.appConfigService.get('KYC_ENCRYPTION_FIXED_IV')
    );
  }

  private decrypt(value: string): unknown {
    return KycEncryptionHelper.decrypt(
      value,
      this.appConfigService.get('KYC_ENCRYPTION_SECRET_KEY'),
      this.appConfigService.get('KYC_ENCRYPTION_FIXED_IV')
    );
  }

  private async transitionOrThrow(
    userId: number,
    expected: SellerOnboardingStatus,
    next: SellerOnboardingStatus,
    data: Partial<StoreInformation>
  ): Promise<void> {
    const transitioned = await this.storeInformationRepository.transitionStatus(
      userId,
      expected,
      next,
      data
    );
    if (!transitioned) {
      throw new BusinessException(ERROR_CODES.SELLER.ONBOARDING_STEP_OUT_OF_ORDER);
    }
  }
}
