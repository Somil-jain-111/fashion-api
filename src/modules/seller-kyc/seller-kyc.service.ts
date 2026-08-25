import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { AppConfigService } from 'src/default/config/config.service';
import { KycEncryptionHelper } from 'src/default/common/helper/kyc-encryption.helper';
import { ReferenceIdUtil } from 'src/default/common/utils/reference-id.util';
import {
  KycLogStatus,
  KycStatus,
  KycType,
  SellerKycOverallStatus,
  SellerKycStatus,
} from 'src/default/common/enums/kyc.enum';
import { LocalStorageContextUtil } from 'src/default/common/utils/local-storage.util';
import { ContextType } from 'src/default/common/constants/context.option';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { UserRepository } from '../auth/repository';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  SellerKycOverrideRepository,
} from './repository';
import { PanProvider, GstProvider, AadhaarProvider, NameMatchProvider } from './provider';
import { VerifyPanDto } from './dto/verify-pan.dto';
import { VerifyGstDto } from './dto/verify-gst.dto';
import { GenerateAadhaarOtpDto } from './dto/generate-aadhaar-otp.dto';
import { VerifyAadhaarOtpDto } from './dto/verify-aadhaar-otp.dto';

const PROVIDER = 'REWARDS_API';
const NAME_MATCH_THRESHOLD = 85;

@Injectable()
export class SellerKycService {
  constructor(
    private userRepository: UserRepository,
    private kycVerificationRepository: KycVerificationRepository,
    private kycVerificationLogRepository: KycVerificationLogRepository,
    private sellerKycOverrideRepository: SellerKycOverrideRepository,
    private userAuthValidator: UserAuthValidator,
    private nameMatchProvider: NameMatchProvider,
    private panProvider: PanProvider,
    private aadhaarProvider: AadhaarProvider,
    private gstProvider: GstProvider,
    private readonly appConfigService: AppConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  private encryptKycData(value: any): any {
    const secretKey = this.appConfigService.get('KYC_ENCRYPTION_SECRET_KEY');
    const fixedIv = this.appConfigService.get('KYC_ENCRYPTION_FIXED_IV');

    return KycEncryptionHelper.encrypt(value, secretKey, fixedIv);
  }

  private decryptKycData(value: any): any {
    const secretKey = this.appConfigService.get('KYC_ENCRYPTION_SECRET_KEY');
    const fixedIv = this.appConfigService.get('KYC_ENCRYPTION_FIXED_IV');

    return KycEncryptionHelper.decrypt(value, secretKey, fixedIv);
  }

  private getPanFailureMessage(statusCode: number, responseData: any): string {
    const statusMap: Record<number, string> = {
      201: 'Invalid PAN number, please try again',
      2007: 'Invalid PAN number, please try again',
      401: 'PAN verification failed, please try again',
    };

    return (
      statusMap[statusCode] ||
      responseData?.data?.message ||
      responseData?.message ||
      'PAN verification failed'
    );
  }

  private getAadhaarOtpFailureMessage(statusCode: number, responseData: any): string {
    const statusMap: Record<number, string> = {
      500: 'Internal Server Error, Please try again.',
      401: 'Signature verification failed.',
      4015: 'Signature verification failed.',
      201: responseData?.data?.message || 'Something went wrong.',
    };

    return (
      statusMap[statusCode] ||
      responseData?.data?.message ||
      responseData?.message ||
      'Aadhaar OTP generation failed'
    );
  }

  private getAadhaarVerifyFailureMessage(statusCode: number, responseData: any): string {
    const statusMap: Record<number, string> = {
      4015: 'Internal Server Error',
      2203: 'Invalid OTP',
      201: responseData?.data?.message || 'Something went wrong.',
    };

    return (
      statusMap[statusCode] ||
      responseData?.data?.message ||
      responseData?.message ||
      'Aadhaar verification failed'
    );
  }

  /**
   * Aadhaar verification
   */

  async generateAadhaarOtp(sellerId: number, body: GenerateAadhaarOtpDto): Promise<any> {
    const tag = 'SellerKycService.generateAadhaarOtp';
    const { aadharNumber, aadharFrontImage, aadharBackImage } = body;

    const user = await this.userAuthValidator.getAllowedUserById(sellerId);

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const encryptedAadhaarNumber = this.encryptKycData(aadharNumber);
    const encryptedFrontImage = this.encryptKycData(aadharFrontImage);
    const encryptedBackImage = this.encryptKycData(aadharBackImage);

    const existingVerifiedAadhaar =
      await this.kycVerificationRepository.findByDocumentNumberAndType(
        encryptedAadhaarNumber,
        KycType.AADHAAR
      );

    if (existingVerifiedAadhaar && Number(existingVerifiedAadhaar.user.id) !== Number(sellerId)) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_IN_USE);
    }

    const userVerifiedAadhaar = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      sellerId,
      KycType.AADHAAR
    );

    if (userVerifiedAadhaar) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_VERIFIED);
    }

    await this.kycVerificationLogRepository.expireAllPendingOtpLogs(sellerId, KycType.AADHAAR);

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.AADHAAR);

    const providerResult = await this.aadhaarProvider.generateOtp({
      aadhaarNumber: aadharNumber,
      transactionId,
    });

    const lastFourDigit = aadharNumber.slice(-4);
    const maskedAadhaar = `XXXXXXXX${lastFourDigit}`;

    await this.kycVerificationLogRepository.createLog({
      user_id: sellerId,
      type: KycType.AADHAAR,
      status: providerResult.success ? KycLogStatus.OTP_SENT : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedAadhaarNumber,
      provider: PROVIDER,
      requestPayload: {
        ...providerResult.requestPayload,
        id_number: maskedAadhaar,
      },
      responsePayload: providerResult.responseData,
      failureReason: providerResult.success ? null : providerResult.message,
      journeyId: LocalStorageContextUtil.get(ContextType.JOURNEY_ID),
    });

    if (!providerResult.success) {
      const message = this.getAadhaarOtpFailureMessage(
        providerResult.statusCode,
        providerResult.responseData
      );

      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_OTP_GENERATION_FAILED, {
        reason: message,
      });
    }

    ConsoleLogger.log('SELLER_AADHAAR_OTP_GENERATE_SUCCESS', { tag, data: { sellerId } });

    return {
      referenceId: transactionId,
      referenceIdOtp:
        providerResult.responseData?.data?.client_id ||
        providerResult.responseData?.data?.reference_id ||
        null,
      maskedAadhaar,
      metadata: {
        aadharFrontImage: encryptedFrontImage,
        aadharBackImage: encryptedBackImage,
        shareCode: this.encryptKycData(lastFourDigit),
      },
    };
  }

  async verifyAadhaarOtp(sellerId: number, body: VerifyAadhaarOtpDto): Promise<any> {
    const tag = 'SellerKycService.verifyAadhaarOtp';
    const { referenceId, referenceIdOtp, otp } = body;

    const user = await this.userAuthValidator.getAllowedUserById(sellerId);

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const otpLog = await this.kycVerificationLogRepository.findLatestValidOtpLog(
      sellerId,
      KycType.AADHAAR,
      referenceId,
      10
    );

    if (!otpLog) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_OTP_EXPIRED);
    }

    const providerResult = await this.aadhaarProvider.verifyOtp({
      referenceId,
      referenceIdOtp,
      otp,
    });

    await this.kycVerificationLogRepository.createLog({
      user_id: sellerId,
      type: KycType.AADHAAR,
      status: providerResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId,
      documentNumber: otpLog.documentNumber,
      provider: PROVIDER,
      requestPayload: { ...providerResult.requestPayload, otp: '******' },
      responsePayload: providerResult.responseData,
      failureReason: providerResult.success ? null : providerResult.message,
      journeyId: LocalStorageContextUtil.get(ContextType.JOURNEY_ID),
    });

    if (!providerResult.success) {
      const message = this.getAadhaarVerifyFailureMessage(
        providerResult.statusCode,
        providerResult.responseData
      );

      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_VERIFICATION_FAILED, { reason: message });
    }

    const aadhaarData = providerResult.responseData?.data || {};

    const encryptedProviderResponse = this.encryptKycData(providerResult.responseData);
    const encryptedVerifiedName = this.encryptKycData(
      aadhaarData.full_name || aadhaarData.name || user.username
    );

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: sellerId,
      type: KycType.AADHAAR,
      referenceId,
      documentNumber: otpLog.documentNumber,
      maskedDocumentNumber: aadhaarData.masked_aadhaar || aadhaarData.maskedAadhaar || null,
      verifiedName: encryptedVerifiedName,
      provider: PROVIDER,
      providerRequest: { referenceId, referenceIdOtp, otp: '******' },
      providerResponse: encryptedProviderResponse,
      metadata: {
        dob: aadhaarData.dob ? this.encryptKycData(aadhaarData.dob) : null,
        gender: aadhaarData.gender ? this.encryptKycData(aadhaarData.gender) : null,
        address: aadhaarData.address ? this.encryptKycData(aadhaarData.address) : null,
      },
    });

    await this.kycVerificationLogRepository.expireAllPendingOtpLogs(sellerId, KycType.AADHAAR);

    ConsoleLogger.log('SELLER_AADHAAR_OTP_VERIFY_SUCCESS', {
      tag,
      data: { sellerId, referenceId },
    });

    return { verified: true, referenceId, message: 'Aadhaar verified successfully' };
  }

  /**
   * PAN verification
   */

  async verifyPan(sellerId: number, body: VerifyPanDto): Promise<any> {
    const tag = 'SellerKycService.verifyPan';
    const { panCard, panImage } = body;
    const pan = panCard.toUpperCase();

    const user = await this.userAuthValidator.getAllowedUserById(sellerId);

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const encryptedPan = await this.encryptKycData(pan);

    const existingUserPan = await this.kycVerificationRepository.findByUserIdAndType(
      String(sellerId),
      KycType.PAN
    );

    if (existingUserPan?.status === KycStatus.VERIFIED) {
      throw new BusinessException(ERROR_CODES.KYC.PAN_ALREADY_SUBMITTED);
    }

    const existingPan = await this.kycVerificationRepository.findByDocumentNumberAndType(
      encryptedPan,
      KycType.PAN
    );

    if (existingPan && Number(existingPan.user.id) !== Number(sellerId)) {
      throw new BusinessException(ERROR_CODES.KYC.PAN_ALREADY_IN_USE);
    }

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.PAN);

    const panProviderResult = await this.panProvider.verifyPan({ panCard: pan, transactionId });

    await this.kycVerificationLogRepository.createLog({
      user_id: sellerId,
      type: KycType.PAN,
      status: panProviderResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      provider: PROVIDER,
      requestPayload: panProviderResult.requestPayload,
      responsePayload: panProviderResult.responseData,
      failureReason: panProviderResult.success ? null : panProviderResult.message,
    });

    if (!panProviderResult.success) {
      const message = this.getPanFailureMessage(
        panProviderResult.statusCode,
        panProviderResult.responseData
      );

      throw new BusinessException(ERROR_CODES.KYC.PAN_VERIFICATION_FAILED, { reason: message });
    }

    const panApiData = panProviderResult.responseData?.data || {};

    if (panApiData?.aadhaar_linked?.toLowerCase() !== 'successful') {
      throw new BusinessException(ERROR_CODES.KYC.PAN_NOT_LINKED_WITH_AADHAAR);
    }

    const nameMatchResult = await this.nameMatchProvider.matchName({
      userName: panApiData?.full_name,
      apiUserName: user?.username,
      transactionId: await ReferenceIdUtil.generateKycReferenceId(KycType.NAME_MATCH),
    });

    const matchScore = Number(nameMatchResult?.responseData?.data?.match_score || 0);
    const isNameMatched = matchScore >= NAME_MATCH_THRESHOLD;

    await this.kycVerificationLogRepository.createLog({
      user_id: sellerId,
      type: KycType.NAME_MATCH,
      status: nameMatchResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: nameMatchResult.requestPayload?.transaction_id,
      provider: PROVIDER,
      requestPayload: nameMatchResult.requestPayload,
      responsePayload: nameMatchResult.responseData,
      failureReason: nameMatchResult.success ? null : nameMatchResult.message,
    });

    if (!isNameMatched) {
      throw new BusinessException(ERROR_CODES.KYC.NAME_MATCH_FAILED, {
        reason: 'PAN name does not match with profile name',
      });
    }

    const [encryptedUserName, encryptedPanImage, encryptedApiData] = await Promise.all([
      this.encryptKycData(user.username),
      this.encryptKycData(panImage || ''),
      this.encryptKycData(panProviderResult.responseData),
    ]);

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: sellerId,
      type: KycType.PAN,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      verifiedName: encryptedUserName,
      provider: PROVIDER,
      maskedDocumentNumber: this.panProvider.maskPanNumber(pan),
      providerRequest: panProviderResult.requestPayload,
      providerResponse: encryptedApiData,
      metadata: {
        matchScore,
        panImage: encryptedPanImage,
        aadhaarLinked: panApiData?.aadhaar_linked,
      },
    });

    ConsoleLogger.log('SELLER_PAN_VERIFY_SUCCESS', { tag, data: { sellerId, matchScore } });

    return { verified: true, matchScore };
  }

  /**
   * GST verification
   */

  async verifyGst(sellerId: number, body: VerifyGstDto): Promise<any> {
    const tag = 'SellerKycService.verifyGst';
    const { gstNumber } = body;
    const gst = gstNumber.toUpperCase();

    const user = await this.userAuthValidator.getAllowedUserById(sellerId);

    const encryptedGst = await this.encryptKycData(gst);

    const existingUserGst = await this.kycVerificationRepository.findByUserIdAndType(
      String(sellerId),
      KycType.GST
    );

    if (existingUserGst?.status === KycStatus.VERIFIED) {
      throw new BusinessException(ERROR_CODES.KYC.GST_VERIFICATION_FAILED, {
        reason: 'GST is already verified',
      });
    }

    const existingGst = await this.kycVerificationRepository.findByDocumentNumberAndType(
      encryptedGst,
      KycType.GST
    );

    if (existingGst && Number(existingGst.user.id) !== Number(sellerId)) {
      throw new BusinessException(ERROR_CODES.KYC.GST_VERIFICATION_FAILED, {
        reason: 'This GST number is already in use by another account',
      });
    }

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.GST);

    const gstProviderResult = await this.gstProvider.verifyGst({ gstNumber: gst, transactionId });

    await this.kycVerificationLogRepository.createLog({
      user_id: sellerId,
      type: KycType.GST,
      status: gstProviderResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedGst,
      provider: PROVIDER,
      requestPayload: gstProviderResult.requestPayload,
      responsePayload: gstProviderResult.responseData,
      failureReason: gstProviderResult.success ? null : gstProviderResult.message,
    });

    if (!gstProviderResult.success) {
      throw new BusinessException(ERROR_CODES.KYC.GST_VERIFICATION_FAILED, {
        reason: gstProviderResult.message || 'GST verification failed',
      });
    }

    const gstApiData = gstProviderResult.responseData?.data || {};
    const encryptedApiData = await this.encryptKycData(gstProviderResult.responseData);

    const metadata = {
      tradeName: gstApiData.business_name,
      legalName: gstApiData.legal_name,
      address: gstApiData.address,
      status: gstApiData.gstin_status,
      dateOfRegistration: gstApiData.date_of_registration,
    };

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: sellerId,
      type: KycType.GST,
      referenceId: transactionId,
      documentNumber: encryptedGst,
      maskedDocumentNumber: this.gstProvider.maskGstNumber(gst),
      verifiedName: this.encryptKycData(
        gstApiData.trade_name || gstApiData.legal_name || user.username
      ),
      provider: PROVIDER,
      providerRequest: gstProviderResult.requestPayload,
      providerResponse: encryptedApiData,
      metadata,
    });

    if (gstApiData.trade_name || gstApiData.legal_name) {
      const firmName = gstApiData.trade_name || gstApiData.legal_name;
      await this.userRepository.update(sellerId, { firmName });
    }

    ConsoleLogger.log('SELLER_GST_VERIFY_SUCCESS', { tag, data: { sellerId } });

    return { verified: true, ...metadata };
  }

  /**
   * "Which KYC is pending" — aggregates PAN/GST/Aadhaar status for the seller,
   * plus a Super Admin manual override if one exists.
   */
  async getProfile(sellerId: number): Promise<any> {
    const [rows, override] = await Promise.all([
      this.kycVerificationRepository.findAllByUserId(sellerId),
      this.sellerKycOverrideRepository.findBySellerId(sellerId),
    ]);

    const byType = (type: KycType) => {
      const row = rows.find((r) => r.type === type && r.status === KycStatus.VERIFIED);

      return {
        verified: Boolean(row),
        verifiedAt: row?.updatedAt ?? null,
      };
    };

    const pan = byType(KycType.PAN);
    const gst = byType(KycType.GST);
    const aadhaar = byType(KycType.AADHAAR);
    const allVerified = pan.verified && gst.verified && aadhaar.verified;
    const anyVerified = pan.verified || gst.verified || aadhaar.verified;

    let status: SellerKycOverallStatus;
    if (override) {
      status =
        override.status === SellerKycStatus.APPROVED
          ? SellerKycOverallStatus.APPROVED
          : SellerKycOverallStatus.REJECTED;
    } else if (allVerified) {
      status = SellerKycOverallStatus.USER_PROFILE_APPROVAL;
    } else if (anyVerified) {
      status = SellerKycOverallStatus.PENDING;
    } else {
      status = SellerKycOverallStatus.NOT_STARTED;
    }

    return {
      pan,
      gst,
      aadhaar,
      status,
      // Finishing all three KYC types alone only queues the seller for Super
      // Admin review (status becomes USER_PROFILE_APPROVAL) — it does not
      // approve them. Only an explicit APPROVED override does that.
      kycApproved: override?.status === SellerKycStatus.APPROVED,
      override: override
        ? {
            status: override.status,
            reason: override.reason ?? null,
            reviewedAt: override.reviewedAt,
          }
        : null,
    };
  }

  /**
   * The Products/Categories create-gates call this directly to check a seller
   * may upload — true only once a Super Admin has explicitly approved them
   * (see `review`). Completing all three KYC types is a prerequisite for that
   * approval, not a substitute for it.
   */
  async isSellerKycApproved(sellerId: number): Promise<boolean> {
    const profile = await this.getProfile(sellerId);
    return profile.kycApproved;
  }

  /**
   * Super Admin manual override — approves or rejects a seller's overall KYC
   * regardless of the automatic per-type result (e.g. an offline exception
   * process). Rejecting is ungated (an admin may reject at any point), but
   * approving still requires all three of PAN/GST/Aadhaar to be individually
   * VERIFIED first — the override exists to formalize that result, not to
   * bypass it.
   */
  async review(
    sellerId: number,
    options: { status: SellerKycStatus; reason?: string; reviewerId: number }
  ): Promise<any> {
    const seller = await this.userRepository.findById(sellerId);

    if (!seller) {
      throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);
    }

    if (options.status === SellerKycStatus.REJECTED && !options.reason) {
      throw new BusinessException(ERROR_CODES.SELLER.KYC_REJECTION_REASON_REQUIRED);
    }

    if (options.status === SellerKycStatus.APPROVED) {
      const profile = await this.getProfile(sellerId);
      const pending = [
        !profile.pan.verified && 'PAN card pending',
        !profile.gst.verified && 'GST pending',
        !profile.aadhaar.verified && 'Aadhaar pending',
      ].filter((entry): entry is string => Boolean(entry));

      if (pending.length > 0) {
        throw new BusinessException(ERROR_CODES.SELLER.KYC_INCOMPLETE_FOR_APPROVAL, {
          pending: pending.join(', '),
        });
      }
    }

    await this.sellerKycOverrideRepository.upsert({
      sellerId,
      status: options.status,
      reason: options.reason,
      reviewerId: options.reviewerId,
    });

    this.eventEmitter.emit('seller.kyc.reviewed', {
      sellerId,
      status: options.status,
      reason: options.reason ?? null,
      reviewerId: options.reviewerId,
    });

    return this.getProfile(sellerId);
  }

  /**
   * Paginated seller list for the Super Admin KYC panel, with a derived overall
   * status per seller. Filtering and pagination both happen in the query
   * itself (see KycVerificationRepository.findSellersByDerivedStatus), not by
   * fetching everything and filtering in memory.
   */
  async listForAdmin(options: {
    status?: SellerKycOverallStatus;
    page: number;
    limit: number;
  }): Promise<any> {
    const { page, limit } = options;
    const status = options.status;

    const { items, total } = await this.kycVerificationRepository.findSellersByDerivedStatus(
      status,
      page,
      limit
    );

    return { items, pagination: CommonUtils.generatePaginationResponse(total, page, limit) };
  }

  /**
   * Full per-type detail for the Super Admin KYC review screen. Deliberately
   * returns masked document numbers, not the raw ones — the encryption exists
   * specifically to protect this PII, and nothing in the review flow needs it.
   */
  async getAdminDetail(sellerId: number): Promise<any> {
    const seller = await this.userRepository.findById(sellerId);

    if (!seller) {
      throw new BusinessException(ERROR_CODES.SELLER.SELLER_NOT_FOUND);
    }

    const [rows, override] = await Promise.all([
      this.kycVerificationRepository.findAllByUserId(sellerId),
      this.sellerKycOverrideRepository.findBySellerId(sellerId),
    ]);

    return {
      sellerId: seller.id,
      name: seller.username ?? null,
      email: seller.email ?? null,
      businessName: seller.firmName ?? null,
      verifications: rows.map((r) => ({
        type: r.type,
        status: r.status,
        maskedDocumentNumber: r.maskedDocumentNumber ?? null,
        verifiedName: r.verifiedName ? this.decryptKycData(r.verifiedName) : null,
        provider: r.provider ?? null,
        verifiedAt: r.updatedAt,
      })),
      override: override
        ? {
            status: override.status,
            reason: override.reason ?? null,
            reviewedBy: override.reviewedBy,
            reviewedAt: override.reviewedAt,
          }
        : null,
    };
  }
}
