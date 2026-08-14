import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { VerifyPanDto } from './dto/verify-pan.dto';
import { VerifyGstDto } from './dto/verify-gst.dto';
import { GstProvider } from './provider/gst.provider';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  BeneficiaryRepository,
} from 'src/modules/kyc/repository';
import { AddBeneficiaryDto } from './dto/add-beneficiary.dto';
import { BankProvider } from './provider/bank.provider';
import { UpiProvider } from './provider/upi.provider';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { AppConfigService } from 'src/default/config/config.service';
import { KycEncryptionHelper } from 'src/default/common/helper/kyc-encryption.helper';
import { ReferenceIdUtil } from 'src/default/common/utils/reference-id.util';
import { KycLogStatus, KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { PanProvider } from './provider/pan.provider';
import { NameMatchProvider } from './provider/name-matching.provider';
import { GenerateAadharOtpDto } from './dto/generate-aadhar.dto';
import { AadhaarProvider } from './provider/aadhaar.provider';
import { VerifyAadhaarOtpDto } from './dto/verify-aadhar-otp.dto';
import { SaveAadhaarDto } from './dto/save-aadhaar.dto';
import { LocalStorageContextUtil } from 'src/default/common/utils/local-storage.util';
import { ContextType } from 'src/default/common/constants/context.option';
import { UserRepository } from '../auth/repository';
import { TransactionService } from 'src/default/databases/transaction';
import { UserBeneficiary } from './entities/beneficiary.entity';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { UserValidator } from 'src/default/common/validators/user.validator';
import { SmsService } from 'src/modules/sms/sms.service';
import { OtpAttemptType } from 'src/default/common/enums/common.enum';
import { OtpHelper } from 'src/default/common/helper/otp.helper';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { MAX_OTP_VERIFY_ATTEMPTS } from '../auth/constants/auth.constants';
import { VerifyBeneficiaryOtpDto } from './dto/verify-beneficiary-otp.dto';
import { ResendBeneficiaryOtpDto } from './dto/resend-beneficiary-otp.dto';
import {
  BeneficiaryRelationshipTypeLabels,
  BeneficiaryStatus,
  BeneficiaryType,
} from 'src/default/common/enums/user-beneficiary.enum';

@Injectable()
export class KycService {
  constructor(
    private userRepository: UserRepository,
    private kycVerificationRepository: KycVerificationRepository,
    private kycVerificationLogRepository: KycVerificationLogRepository,
    private beneficiaryRepository: BeneficiaryRepository,
    private userAuthValidator: UserAuthValidator,
    private nameMatchProvider: NameMatchProvider,
    private panProvider: PanProvider,
    private aadhaarProvider: AadhaarProvider,
    private gstProvider: GstProvider,
    private bankProvider: BankProvider,
    private upiProvider: UpiProvider,
    private readonly appConfigService: AppConfigService,
    private readonly dataSource: DataSource,
    private readonly transactionService: TransactionService,
    private readonly userValidator: UserValidator,
    private readonly smsService: SmsService
  ) {}

  encryptKycData(value: any): any {
    const secretKey = this.appConfigService.get('KYC_ENCRYPTION_SECRET_KEY');
    const fixedIv = this.appConfigService.get('KYC_ENCRYPTION_FIXED_IV');

    return KycEncryptionHelper.encrypt(value, secretKey, fixedIv);
  }

  decryptKycData(value: any): any {
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
   * Aadhaar Verification
   */

  async generateAadhaarOtp(userId: number, body: GenerateAadharOtpDto): Promise<any> {
    const tag = 'KycService.generateAadhaarOtp';

    const { aadharNumber, aadharFrontImage, aadharBackImage } = body;

    ConsoleLogger.log('AADHAAR_OTP_GENERATE_START', {
      tag,
      data: {
        userId: userId,
      },
    });

    /**
     * 1. Validate user
     */
    const user = await this.userAuthValidator.getAllowedUserById(userId);

    // const shouldVerifyAadhaar = RedemptionKYCRequirements[user.partnerType]?.includes(
    //   KycType.AADHAAR
    // );

    // if (!shouldVerifyAadhaar) {
    //   throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
    //     reason: 'AADHAAR not required for this user',
    //   });
    // }

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const encryptedAadhaarNumber = this.encryptKycData(aadharNumber);
    const encryptedFrontImage = this.encryptKycData(aadharFrontImage);
    const encryptedBackImage = this.encryptKycData(aadharBackImage);

    /**
     * 4. Check already verified Aadhaar
     */
    const existingVerifiedAadhaar =
      await this.kycVerificationRepository.findByDocumentNumberAndType(
        encryptedAadhaarNumber,
        KycType.AADHAAR
      );

    if (existingVerifiedAadhaar && existingVerifiedAadhaar.user.id !== userId) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_IN_USE);
    }

    const userVerifiedAadhaar = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      userId,
      KycType.AADHAAR
    );

    if (userVerifiedAadhaar) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_VERIFIED);
    }

    /**
     * 5. Expire previous pending OTP logs
     */
    await this.kycVerificationLogRepository.expireAllPendingOtpLogs(userId, KycType.AADHAAR);

    /**
     * 6. Call provider
     */
    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.AADHAAR);

    const providerResult = await this.aadhaarProvider.generateOtp({
      aadhaarNumber: aadharNumber,
      transactionId,
    });

    const lastFourDigit = aadharNumber.slice(-4);
    const maskedAadhaar = `XXXXXXXX${lastFourDigit}`;

    /**
     * 7. Log OTP attempt
     * Do not store raw Aadhaar number in logs.
     */
    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.AADHAAR,
      status: providerResult.success ? KycLogStatus.OTP_SENT : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedAadhaarNumber,
      provider: 'REWARDS_API',
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

    ConsoleLogger.log('AADHAAR_OTP_GENERATE_SUCCESS', {
      tag,
      data: {
        userId: userId,
        referenceId: transactionId,
      },
    });

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

  async verifyAadhaarOtp(userId: number, body: VerifyAadhaarOtpDto): Promise<any> {
    const tag = 'KycService.verifyAadhaarOtp';
    const { referenceId, referenceIdOtp, otp } = body;

    ConsoleLogger.log('AADHAAR_OTP_VERIFY_START', {
      tag,
      data: {
        userId: userId,
        referenceId,
      },
    });

    /**
     * 1. Validate user
     */
    const user = await this.userAuthValidator.getAllowedUserById(userId);

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    /**
     * 2. Validate OTP
     */
    if (!/^\d{6}$/.test(otp)) {
      throw new BusinessException(ERROR_CODES.KYC.INVALID_OTP);
    }

    /**
     * 3. Check valid OTP request from logs
     */
    const otpLog = await this.kycVerificationLogRepository.findLatestValidOtpLog(
      userId,
      KycType.AADHAAR,
      referenceId,
      10
    );

    if (!otpLog) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_OTP_EXPIRED);
    }

    /**
     * 4. Call provider
     */
    const providerResult = await this.aadhaarProvider.verifyOtp({
      referenceId,
      referenceIdOtp,
      otp,
    });

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.AADHAAR,
      status: providerResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId,
      documentNumber: otpLog.documentNumber,
      provider: 'REWARDS_API',
      requestPayload: {
        ...providerResult.requestPayload,
        otp: '******',
      },
      responsePayload: providerResult.responseData,
      failureReason: providerResult.success ? null : providerResult.message,
      journeyId: LocalStorageContextUtil.get(ContextType.JOURNEY_ID),
    });

    if (!providerResult.success) {
      const message = this.getAadhaarVerifyFailureMessage(
        providerResult.statusCode,
        providerResult.responseData
      );

      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_VERIFICATION_FAILED, {
        reason: message,
      });
    }

    const aadhaarData = providerResult.responseData?.data || {};

    /**
     * 5. Upload provider profile image if needed
     */
    const uploadedAadhaarImage: string | null = null;

    // if (aadhaarData.profile_image) {
    //   uploadedAadhaarImage = await this.imageUpload(aadhaarData.profile_image, {
    //     type: "image",
    //     path: "aadhar",
    //     extension: "jpeg",
    //   });
    // }

    /**
     * 6. Save verified Aadhaar only in kyc_verifications
     */
    const aadhaarName = aadhaarData.full_name || aadhaarData.name || user.username;

    const encryptedProviderResponse = this.encryptKycData(providerResult.responseData);
    const encryptedProfileImage = this.encryptKycData(uploadedAadhaarImage || '');
    const encryptedVerifiedName = this.encryptKycData(aadhaarName);

    const maskedDocumentNumber =
      aadhaarData.masked_aadhaar ||
      aadhaarData.maskedAadhaar ||
      this.aadhaarProvider.maskAadhaarNumber(aadhaarName);

    const metadata = {
      profileImage: encryptedProfileImage,
      maskedDocumentNumber: maskedDocumentNumber,
      dob: aadhaarData?.dob,
      gender: aadhaarData?.gender,
    };

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.AADHAAR,
      referenceId,
      documentNumber: otpLog.documentNumber,
      maskedDocumentNumber: maskedDocumentNumber,
      verifiedName: encryptedVerifiedName,
      provider: 'REWARDS_API',
      providerRequest: {
        referenceId,
        referenceIdOtp,
        otp: '******',
      },
      providerResponse: encryptedProviderResponse,
      metadata: metadata,
    });

    /**
     * 7. Expire previous OTP_SENT log after verification
     */
    await this.kycVerificationLogRepository.expireAllPendingOtpLogs(userId, KycType.AADHAAR);

    ConsoleLogger.log('AADHAAR_OTP_VERIFY_SUCCESS', {
      tag,
      data: {
        userId: userId,
        referenceId,
      },
    });

    return {
      verified: true,
      referenceId,
      message: 'Aadhaar verified successfully',
      metadata,
    };
  }

  async saveAadhaar(userId: number, body: SaveAadhaarDto): Promise<any> {
    const tag = 'KycService.saveAadhaar';
    const { aadharNumber, aadharFrontImage, aadharBackImage } = body;

    ConsoleLogger.log('AADHAAR_SAVE_START', {
      tag,
      data: { userId },
    });

    const user = await this.userAuthValidator.getAllowedUserById(userId);

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const encryptedAadhaarNumber = this.encryptKycData(aadharNumber);

    const existingAadhaar = await this.kycVerificationRepository.findByDocumentNumberAndType(
      encryptedAadhaarNumber,
      KycType.AADHAAR
    );

    if (existingAadhaar && existingAadhaar.user.id !== userId) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_IN_USE);
    }

    const userVerifiedAadhaar = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      userId,
      KycType.AADHAAR
    );

    if (userVerifiedAadhaar) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_VERIFIED);
    }

    const referenceId = await ReferenceIdUtil.generateKycReferenceId(KycType.AADHAAR);

    const maskedAadhaar = this.aadhaarProvider.maskAadhaarNumber(aadharNumber);

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId,
      type: KycType.AADHAAR,
      status: KycStatus.VERIFIED,
      referenceId,
      documentNumber: encryptedAadhaarNumber,
      maskedDocumentNumber: maskedAadhaar,
      provider: 'MANUAL',
      providerRequest: {
        aadharFrontImage,
        aadharBackImage,
      },
      metadata: {
        maskedDocumentNumber: maskedAadhaar,
      },
    });

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.AADHAAR,
      status: KycLogStatus.SUBMITTED,
      referenceId,
      documentNumber: encryptedAadhaarNumber,
      provider: 'MANUAL',
      requestPayload: {
        aadharFrontImage,
        aadharBackImage,
      },
      journeyId: LocalStorageContextUtil.get(ContextType.JOURNEY_ID),
    });

    ConsoleLogger.log('AADHAAR_SAVE_SUCCESS', {
      tag,
      data: { userId, referenceId },
    });

    return {
      referenceId,
      maskedAadhaar,
      message: 'Aadhaar details saved successfully.',
    };
  }

  /**
   * PAN Verification
   */

  async verifyPan(userId: number, body: VerifyPanDto): Promise<any> {
    const tag = 'KycService.verifyPan';

    const { panCard, panImage } = body;
    const pan = panCard.toUpperCase();
    const userIdString = userId.toString();

    ConsoleLogger.log('VERIFY_PAN_START', {
      tag,
      data: {
        userId: userIdString,
        pan,
      },
    });

    const user = await this.userAuthValidator.getAllowedUserById(userId);

    // const shouldVerifyPan = RedemptionKYCRequirements[user.partnerType]?.includes(KycType.PAN);

    // if (!shouldVerifyPan) {
    //   throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
    //     reason: 'PAN not required for this user',
    //   });
    // }

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const encryptedPan = await this.encryptKycData(pan);

    const existingUserPan = await this.kycVerificationRepository.findByUserIdAndType(
      userIdString,
      KycType.PAN
    );

    if (existingUserPan?.status === KycStatus.VERIFIED) {
      throw new BusinessException(ERROR_CODES.KYC.PAN_ALREADY_SUBMITTED);
    }

    const existingPan = await this.kycVerificationRepository.findByDocumentNumberAndType(
      encryptedPan,
      KycType.PAN
    );

    if (existingPan && existingPan.user.id !== userId) {
      throw new BusinessException(ERROR_CODES.KYC.PAN_ALREADY_IN_USE);
    }

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.PAN);

    const panProviderResult = await this.panProvider.verifyPan({
      panCard: pan,
      transactionId,
    });

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.PAN,
      status: panProviderResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      provider: 'REWARDS_API',
      requestPayload: panProviderResult.requestPayload,
      responsePayload: panProviderResult.responseData,
      failureReason: panProviderResult.success ? null : panProviderResult.message,
    });

    if (!panProviderResult.success) {
      const message = this.getPanFailureMessage(
        panProviderResult.statusCode,
        panProviderResult.responseData
      );

      throw new BusinessException(ERROR_CODES.KYC.PAN_VERIFICATION_FAILED, {
        reason: message,
      });
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
    const isNameMatched = matchScore >= 85;

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.NAME_MATCH,
      status: nameMatchResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: nameMatchResult.requestPayload?.transaction_id,
      provider: 'REWARDS_API',
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

    const maskedDocumentNumber = this.panProvider.maskPanNumber(pan);

    const metadata = {
      matchScore,
      maskedDocumentNumber: maskedDocumentNumber,
      panImage: encryptedPanImage,
      aadhaarLinked: panApiData?.aadhaar_linked,
    };

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.PAN,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      verifiedName: encryptedUserName,
      provider: 'REWARDS_API',
      maskedDocumentNumber: maskedDocumentNumber,
      providerRequest: panProviderResult.requestPayload,
      providerResponse: encryptedApiData,
      metadata: metadata,
    });

    ConsoleLogger.log('VERIFY_PAN_SUCCESS', {
      tag,
      data: {
        userId: userIdString,
        matchScore,
      },
    });

    return {
      verified: true,
      referenceId: transactionId,
      metadata,
    };
  }

  /**
   * Beneficiary PAN Verification
   */
  async verifyBeneficiaryPanInternal(
    userId: number,
    body: VerifyPanDto,
    beneficiary_name?: string,
    queryRunner?: QueryRunner
  ): Promise<any> {
    const tag = 'KycService.verifyBeneficiaryPanInternal';

    const { panCard, panImage } = body;
    const pan = panCard.toUpperCase();
    const userIdString = userId.toString();

    ConsoleLogger.log('VERIFY_BENEFICIARY_PAN_START', {
      tag,
      data: {
        userId: userIdString,
        pan,
      },
    });

    const user = await this.userAuthValidator.getAllowedUserById(userId);

    if (!beneficiary_name) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    const encryptedPan = await this.encryptKycData(pan);

    // const existingUserPan = await this.kycVerificationRepository.findByUserIdAndType(
    //   userIdString,
    //   KycType.BENE_PAN,
    //   queryRunner
    // );

    // if (existingUserPan?.status === KycStatus.VERIFIED) {
    //   throw new BusinessException(ERROR_CODES.KYC.PAN_ALREADY_SUBMITTED);
    // }

    const existingPan = await this.kycVerificationRepository.findByDocumentNumberAndType(
      encryptedPan,
      KycType.BENE_PAN,
      queryRunner
    );

    if (existingPan) {
      throw new BusinessException(ERROR_CODES.KYC.PAN_ALREADY_IN_USE);
    }

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.BENE_PAN);

    const panProviderResult = await this.panProvider.verifyPan({
      panCard: pan,
      transactionId,
    });

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.BENE_PAN,
      status: panProviderResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      provider: 'REWARDS_API',
      requestPayload: panProviderResult.requestPayload,
      responsePayload: panProviderResult.responseData,
      failureReason: panProviderResult.success ? null : panProviderResult.message,
    });

    if (!panProviderResult.success) {
      const message = this.getPanFailureMessage(
        panProviderResult.statusCode,
        panProviderResult.responseData
      );

      throw new BusinessException(ERROR_CODES.KYC.PAN_VERIFICATION_FAILED, {
        reason: message,
      });
    }

    const panApiData = panProviderResult.responseData?.data || {};

    if (panApiData?.aadhaar_linked?.toLowerCase() !== 'successful') {
      throw new BusinessException(ERROR_CODES.KYC.PAN_NOT_LINKED_WITH_AADHAAR);
    }

    const nameMatchResult = await this.nameMatchProvider.matchName({
      userName: panApiData?.full_name,
      apiUserName: beneficiary_name,
      transactionId: await ReferenceIdUtil.generateKycReferenceId(KycType.NAME_MATCH),
    });

    const matchScore = Number(nameMatchResult?.responseData?.data?.match_score || 0);
    const isNameMatched = matchScore >= 85;

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.NAME_MATCH,
      status: nameMatchResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: nameMatchResult.requestPayload?.transaction_id,
      provider: 'REWARDS_API',
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

    const maskedDocumentNumber = this.panProvider.maskPanNumber(pan);

    const metadata = {
      matchScore,
      maskedDocumentNumber: maskedDocumentNumber,
      panImage: encryptedPanImage,
      aadhaarLinked: panApiData?.aadhaar_linked,
    };

    const panVerification = await this.kycVerificationRepository.upsertVerifiedKyc(
      {
        userId: userId,
        type: KycType.BENE_PAN,
        referenceId: transactionId,
        documentNumber: encryptedPan,
        verifiedName: encryptedUserName,
        provider: 'REWARDS_API',
        maskedDocumentNumber: maskedDocumentNumber,
        providerRequest: panProviderResult.requestPayload,
        providerResponse: encryptedApiData,
        metadata: metadata,
      },
      queryRunner
    );

    ConsoleLogger.log('VERIFY_BENEFICIARY_PAN_SUCCESS', {
      tag,
      data: {
        userId: userIdString,
        matchScore,
      },
    });

    return {
      verified: true,
      referenceId: transactionId,
      metadata,
      panVerification,
    };
  }

  /**
   * Beneficiary Aadhaar Save
   */
  async saveBeneficiaryAadhaarInternal(
    userId: number,
    body: SaveAadhaarDto,
    beneficiary_name?: string,
    queryRunner?: QueryRunner
  ): Promise<any> {
    const tag = 'KycService.saveBeneficiaryAadhaarInternal';
    const { aadharNumber, aadharFrontImage, aadharBackImage } = body;

    ConsoleLogger.log('BENEFICIARY_AADHAAR_SAVE_START', {
      tag,
      data: { userId },
    });

    const user = await this.userAuthValidator.getAllowedUserById(userId);

    if (!beneficiary_name) {
      throw new BusinessException(ERROR_CODES.KYC.MISSING_BENEFICIARY_NAME);
    }

    const encryptedAadhaarNumber = this.encryptKycData(aadharNumber);

    const existingAadhaar = await this.kycVerificationRepository.findByDocumentNumberAndType(
      encryptedAadhaarNumber,
      KycType.BENE_AADHAAR,
      queryRunner
    );

    if (existingAadhaar) {
      throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_IN_USE);
    }

    // const userVerifiedAadhaar = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
    //   userId,
    //   KycType.BENE_AADHAAR,
    //   queryRunner
    // );

    // if (userVerifiedAadhaar) {
    //   throw new BusinessException(ERROR_CODES.KYC.AADHAAR_ALREADY_VERIFIED);
    // }

    const referenceId = await ReferenceIdUtil.generateKycReferenceId(KycType.BENE_AADHAAR);

    const maskedAadhaar = this.aadhaarProvider.maskAadhaarNumber(aadharNumber);

    const aadhaarVerification = await this.kycVerificationRepository.upsertVerifiedKyc(
      {
        userId,
        type: KycType.BENE_AADHAAR,
        status: KycStatus.VERIFIED,
        referenceId,
        documentNumber: encryptedAadhaarNumber,
        maskedDocumentNumber: maskedAadhaar,
        provider: 'MANUAL',
        providerRequest: {
          aadharFrontImage,
          aadharBackImage,
        },
        metadata: {
          aadharNumber,
        },
      },
      queryRunner
    );

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.BENE_AADHAAR,
      status: KycLogStatus.SUBMITTED,
      referenceId,
      documentNumber: encryptedAadhaarNumber,
      provider: 'MANUAL',
      requestPayload: {
        aadharFrontImage,
        aadharBackImage,
      },
      journeyId: LocalStorageContextUtil.get(ContextType.JOURNEY_ID),
    });

    ConsoleLogger.log('BENEFICIARY_AADHAAR_SAVE_SUCCESS', {
      tag,
      data: { userId, referenceId },
    });

    return {
      referenceId,
      maskedAadhaar,
      message: 'Beneficiary Aadhaar details saved successfully.',
      aadhaarVerification,
    };
  }

  /**
   * GST Verification
   */

  async verifyGst(userId: number, body: VerifyGstDto): Promise<any> {
    const tag = 'KycService.verifyGst';
    const { gstNumber } = body;
    const gst = gstNumber.toUpperCase();
    const userIdString = userId.toString();

    ConsoleLogger.log('VERIFY_GST_START', {
      tag,
      data: {
        userId: userIdString,
        gst,
      },
    });

    const user = await this.userAuthValidator.getAllowedUserById(userId);

    // const shouldVerifyGst = RedemptionKYCRequirements[user.partnerType]?.includes(KycType.GST);

    // if (!shouldVerifyGst) {
    //   throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
    //     reason: 'GST not required for this user',
    //   });
    // }

    // if (user.partnerType !== UserPartnerType.INDIVIDUAL) {
    //   throw new BusinessException(ERROR_CODES.KYC.INVALID_PARTNER_TYPE_FOR_GST);
    // }

    const encryptedGst = await this.encryptKycData(gst);

    const existingUserGst = await this.kycVerificationRepository.findByUserIdAndType(
      userIdString,
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

    if (existingGst && existingGst.user.id !== userId) {
      throw new BusinessException(ERROR_CODES.KYC.GST_VERIFICATION_FAILED, {
        reason: 'This GST number is already in use by another account',
      });
    }

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.GST);

    const gstProviderResult = await this.gstProvider.verifyGst({
      gstNumber: gst,
      transactionId,
    });

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.GST,
      status: gstProviderResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: encryptedGst,
      provider: 'REWARDS_API',
      requestPayload: gstProviderResult.requestPayload,
      responsePayload: gstProviderResult.responseData,
      failureReason: gstProviderResult.success ? null : gstProviderResult.message,
    });

    if (!gstProviderResult.success) {
      const message = gstProviderResult.message || 'GST verification failed';
      throw new BusinessException(ERROR_CODES.KYC.GST_VERIFICATION_FAILED, {
        reason: message,
      });
    }

    const gstApiData = gstProviderResult.responseData?.data || {};

    const encryptedApiData = await this.encryptKycData(gstProviderResult.responseData);
    const maskedDocumentNumber = this.gstProvider.maskGstNumber(gst);

    const metadata = {
      maskedDocumentNumber: maskedDocumentNumber,
      tradeName: gstApiData?.business_name,
      legalName: gstApiData?.legal_name,
      address: gstApiData?.address,
      status: gstApiData?.gstin_status,
      dateOfRegistration: gstApiData?.date_of_registration,
    };

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.GST,
      referenceId: transactionId,
      documentNumber: encryptedGst,
      maskedDocumentNumber: metadata.maskedDocumentNumber,
      verifiedName: this.encryptKycData(
        gstApiData.trade_name || gstApiData.legal_name || user.username
      ),
      provider: 'REWARDS_API',
      providerRequest: gstProviderResult.requestPayload,
      providerResponse: encryptedApiData,
      metadata: metadata,
    });

    // Update user's firmName if it's not already set
    if (gstApiData.trade_name || gstApiData.legal_name) {
      const firmName = gstApiData.trade_name || gstApiData.legal_name;
      await this.userRepository.update(userId, { firmName });
    }

    ConsoleLogger.log('VERIFY_GST_SUCCESS', {
      tag,
      data: {
        userId: userIdString,
      },
    });

    return {
      verified: true,
      referenceId: transactionId,
      metadata,
    };
  }

  /**
   * Bank/UPI Verification
   */

  private async verifyAndAddBankBeneficiary(
    userId: number,
    dto: AddBeneficiaryDto,
    queryRunner?: QueryRunner,
    panVerification?: KycVerificationEntity | null,
    aadhaarVerification?: KycVerificationEntity | null
  ): Promise<any> {
    const tag = 'KycService.verifyAndAddBankBeneficiary';
    const {
      accountNumber,
      reEnterAccountNumber,
      ifsc,
      bankHolderName,
      beneficiary_name,
      mobile,
      panNumber,
      aadhaarNumber,
      address,
      relationship,
    } = dto;

    const normalizedAccountNumber = accountNumber?.toUpperCase().trim() || '';
    const normalizedReEnterAccountNumber = reEnterAccountNumber?.toUpperCase().trim() || '';
    const normalizedIfsc = ifsc?.toUpperCase().trim() || '';
    const normalizedHolderName = (bankHolderName || beneficiary_name)?.trim() || '';

    /** 1️⃣ Basic Validation */
    if (normalizedAccountNumber !== normalizedReEnterAccountNumber) {
      ConsoleLogger.warn(`ACCOUNT_MISMATCH | userId: ${userId}`, tag);
      throw new BusinessException(ERROR_CODES.KYC.ACCOUNT_MISMATCH);
    }

    /** 2️⃣ Validate User */
    const user = await this.userAuthValidator.validateActiveUserById(userId);

    if (!user.username) {
      throw new BusinessException(ERROR_CODES.KYC.USER_PROFILE_NAME_REQUIRED);
    }

    /** 3️⃣ Encrypt identifiers for duplicate check & storage */
    const [accountNumberENC, ifscENC, bankHolderNameENC] = await Promise.all([
      this.encryptKycData(normalizedAccountNumber),
      this.encryptKycData(normalizedIfsc),
      this.encryptKycData(normalizedHolderName),
    ]);

    /**
     * 4️⃣ Check if this bank account is already registered — by this user or any
     * other user. Scoping this check to userId only (as before) let the same
     * account/IFSC be registered by multiple different users, unlike the
     * PAN/Aadhaar duplicate checks above.
     */
    const existingBeneficiary = await this.beneficiaryRepository.isAccountInfoExist(
      accountNumberENC,
      ifscENC,
      queryRunner
    );

    if (existingBeneficiary) {
      ConsoleLogger.warn(`ACCOUNT_ALREADY_USED | userId: ${userId}`, tag);
      throw new BusinessException(ERROR_CODES.KYC.ACCOUNT_ALREADY_USED);
    }

    /** 5️⃣ Call 3rd-party Bank Verification API */
    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.BANK);

    const bankResult = await this.bankProvider.validateBankAccount({
      accountNumber: normalizedAccountNumber,
      ifsc: normalizedIfsc,
      transactionId,
    });

    /** Log attempt (outside transaction so counts are preserved) */
    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.BANK,
      status: bankResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: accountNumberENC,
      provider: 'REWARDS_API',
      requestPayload: bankResult.requestPayload,
      responsePayload: bankResult.responseData,
      failureReason: bankResult.success ? null : bankResult.message,
    });

    if (!bankResult.success) {
      const message = bankResult.message || 'Bank verification failed';
      ConsoleLogger.warn(`BANK_VERIFICATION_FAILED | userId: ${userId} | msg: ${message}`, tag);
      throw new BusinessException(ERROR_CODES.KYC.BANK_VERIFICATION_FAILED, {
        reason: message,
      });
    }

    const bankApiData = bankResult.responseData?.data || {};
    const bankName = bankApiData?.bank_name || bankApiData?.bankName || null;

    /** 6️⃣ Name Matching */
    const accountHolderNameFromApi =
      bankApiData?.c_name || bankApiData?.name || normalizedHolderName;

    const nameMatchResult = await this.nameMatchProvider.matchName({
      userName: accountHolderNameFromApi,
      apiUserName: normalizedHolderName,
      transactionId: await ReferenceIdUtil.generateKycReferenceId(KycType.NAME_MATCH),
    });

    const matchScore = Number(nameMatchResult?.responseData?.data?.match_score || 0);
    const isNameMatched = matchScore >= 85;

    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.NAME_MATCH,
      status:
        nameMatchResult.success && isNameMatched ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: nameMatchResult.requestPayload?.transaction_id,
      provider: 'REWARDS_API',
      requestPayload: nameMatchResult.requestPayload,
      responsePayload: nameMatchResult.responseData,
      failureReason: isNameMatched ? null : 'Name match score below threshold',
    });

    if (!isNameMatched) {
      throw new BusinessException(ERROR_CODES.KYC.NAME_MATCH_FAILED, {
        reason: 'Bank account holder name does not match profile name',
      });
    }

    /** 7️⃣ Save Beneficiary */
    const relationshipStr = relationship?.trim() || null;
    const nameStr = (beneficiary_name || bankHolderName)?.trim() || null;
    const mobileNumberStr = String(mobile)?.trim() || null;
    const panNumberStr = panNumber?.trim() || null;
    const aadhaarNumberStr = aadhaarNumber?.trim() || null;
    const addressStr = address?.trim() || null;

    const [
      bankNameENC,
      providerResponseENC,
      relationshipENC,
      nameENC,
      mobileNumberENC,
      panNumberENC,
      aadhaarNumberENC,
      addressENC,
    ] = await Promise.all([
      this.encryptKycData(bankName || ''),
      this.encryptKycData(bankResult.responseData),
      relationshipStr ? this.encryptKycData(relationshipStr) : null,
      nameStr ? this.encryptKycData(nameStr) : null,
      mobileNumberStr ? this.encryptKycData(mobileNumberStr) : null,
      panNumberStr ? this.encryptKycData(panNumberStr) : null,
      aadhaarNumberStr ? this.encryptKycData(aadhaarNumberStr) : null,
      addressStr ? this.encryptKycData(addressStr) : null,
    ]);

    const metadata = {
      ...this.bankProvider.maskAccountDetails({
        accountNumber: normalizedAccountNumber,
        ifsc: normalizedIfsc,
        bankHolderName: normalizedHolderName,
      }),
    };

    const beneficiary = await this.beneficiaryRepository.createBeneficiary(
      {
        userId,
        type: BeneficiaryType.BANK,
        accountNumber: accountNumberENC,
        ifsc: ifscENC,
        bankName: bankNameENC,
        bankHolderName: bankHolderNameENC,
        relationship: relationshipENC,
        beneficiary_name: nameENC,
        mobileNumber: mobileNumberENC,
        panNumber: panNumberENC,
        aadhaarNumber: aadhaarNumberENC,
        address: addressENC,
        status: BeneficiaryStatus.PENDING,
        referenceId: transactionId,
        panVerification: { id: panVerification?.id } as any,
        aadhaarVerification: { id: aadhaarVerification?.id } as any,
        metadata: {
          matchScore,
          rawResponse: providerResponseENC,
          ...metadata,
        },
      },
      queryRunner
    );

    ConsoleLogger.log(`VERIFY_ACCOUNT_SUCCESS | userId: ${userId} | id: ${beneficiary.id}`, tag);

    return {
      beneficiary,
      metadata,
    };
  }

  private async verifyAndAddUpiBeneficiary(
    userId: number,
    dto: AddBeneficiaryDto,
    queryRunner?: QueryRunner,
    panVerification?: KycVerificationEntity | null,
    aadhaarVerification?: KycVerificationEntity | null
  ): Promise<any> {
    const tag = 'KycService.verifyAndAddUpiBeneficiary';
    const {
      upi,
      bankHolderName,
      beneficiary_name,
      mobile,
      panNumber,
      aadhaarNumber,
      address,
      relationship,
    } = dto;
    const normalizedUpi = upi?.trim() || '';

    /** 1️⃣ Validate User */
    const user = await this.userAuthValidator.validateActiveUserById(userId);

    /** 2️⃣ Encrypt UPI for duplicate check & storage */
    const upiENC = this.encryptKycData(normalizedUpi);

    /**
     * 3️⃣ Check if this UPI ID is already registered — by this user or any other
     * user (see verifyAndAddBankBeneficiary for the same fix on bank accounts).
     */
    const existingBeneficiary = await this.beneficiaryRepository.isUpiExist(upiENC, queryRunner);

    if (existingBeneficiary) {
      ConsoleLogger.warn(`UPI_ALREADY_USED | userId: ${userId}`, tag);
      throw new BusinessException(ERROR_CODES.KYC.UPI_ALREADY_USED);
    }

    /** 4️⃣ Call 3rd-party UPI Verification API */
    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.UPI);

    const upiResult = await this.upiProvider.validateUpi({
      upi: normalizedUpi,
      transactionId,
    });

    /** Log attempt (outside transaction so counts are preserved) */
    await this.kycVerificationLogRepository.createLog({
      user_id: userId,
      type: KycType.UPI,
      status: upiResult.success ? KycLogStatus.VERIFIED : KycLogStatus.FAILED,
      referenceId: transactionId,
      documentNumber: upiENC,
      provider: 'REWARDS_API',
      requestPayload: upiResult.requestPayload,
      responsePayload: upiResult.responseData,
      failureReason: upiResult.success ? null : upiResult.message,
    });

    if (!upiResult.success) {
      const message = upiResult.message || 'UPI verification failed';
      ConsoleLogger.warn(`UPI_VERIFICATION_FAILED | userId: ${userId} | msg: ${message}`, tag);
      throw new BusinessException(ERROR_CODES.KYC.UPI_VERIFICATION_FAILED, {
        reason: message,
      });
    }

    /** 5️⃣ Save Beneficiary */
    const relationshipStr = relationship?.trim() || null;
    const nameStr = (beneficiary_name || bankHolderName)?.trim() || null;
    const mobileNumberStr = String(mobile)?.trim() || null;
    const panNumberStr = panNumber?.trim() || null;
    const aadhaarNumberStr = aadhaarNumber?.trim() || null;
    const addressStr = address?.trim() || null;

    const [
      providerResponseENC,
      relationshipENC,
      nameENC,
      mobileNumberENC,
      panNumberENC,
      aadhaarNumberENC,
      addressENC,
    ] = await Promise.all([
      this.encryptKycData(upiResult.responseData),
      relationshipStr ? this.encryptKycData(relationshipStr) : null,
      nameStr ? this.encryptKycData(nameStr) : null,
      mobileNumberStr ? this.encryptKycData(mobileNumberStr) : null,
      panNumberStr ? this.encryptKycData(panNumberStr) : null,
      aadhaarNumberStr ? this.encryptKycData(aadhaarNumberStr) : null,
      addressStr ? this.encryptKycData(addressStr) : null,
    ]);

    const metadata = {
      upi: this.upiProvider.maskUpiId(normalizedUpi),
    };

    const beneficiary = await this.beneficiaryRepository.createBeneficiary(
      {
        userId,
        type: BeneficiaryType.UPI,
        upi: upiENC,
        relationship: relationshipENC,
        beneficiary_name: nameENC,
        mobileNumber: mobileNumberENC,
        panNumber: panNumberENC,
        aadhaarNumber: aadhaarNumberENC,
        address: addressENC,
        status: BeneficiaryStatus.PENDING,
        referenceId: transactionId,
        panVerification: { id: panVerification?.id } as any,
        aadhaarVerification: { id: aadhaarVerification?.id } as any,
        metadata: {
          rawResponse: providerResponseENC,
          ...metadata,
        },
      },
      queryRunner
    );

    ConsoleLogger.log(`VERIFY_UPI_SUCCESS | userId: ${userId} | id: ${beneficiary.id}`, tag);

    return {
      beneficiary,
      metadata,
    };
  }

  /**
   * Beneficiary Addition & Verification (Unified Entrypoint)
   * Verify PAN, AADHAAR, BANK, UPI + SEND OTP
   *
   * @param userId
   * @param dto
   * @returns
   */
  async addBeneficiary(userId: number, dto: AddBeneficiaryDto): Promise<any> {
    const user = await this.userAuthValidator.validateActiveUserById(userId);
    const mobile = dto.mobile?.trim() || user.mobile;

    const otpValidation = await this.userValidator.validateOtpAttempts({
      mobile,
      otpType: OtpAttemptType.BENEFICIARY,
      userRole: user.role?.name,
      userId: user.id,
      increment: true,
    });

    let otpPlain = await OtpHelper.generateOtp();
    const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();

    if (!isProd) {
      otpPlain = this.appConfigService.getNonProdOtp().toString();
    }

    const expirySeconds = otpValidation.expirySeconds;
    const otpExpiry = OtpHelper.generateExpiryDate(expirySeconds);
    const encryptedOtp = CommonUtils.encrypt(otpPlain);

    const result = await this.transactionService.runInTransaction(async (queryRunner) => {
      /** 1️⃣ If PAN provided, verify PAN & save under BENE_PAN in kyc_verifications */
      const panCard = dto.panNumber?.toUpperCase()?.trim();
      let panVerification: KycVerificationEntity | null = null;

      if (panCard) {
        const panRes = await this.verifyBeneficiaryPanInternal(
          userId,
          { panCard, panImage: '' },
          dto.beneficiary_name,
          queryRunner
        );
        panVerification = panRes?.panVerification || null;
      }

      /** 2️⃣ If Aadhaar provided, save Aadhaar under BENE_AADHAAR in kyc_verifications */
      const aadharNumber = dto.aadhaarNumber?.trim();
      let aadhaarVerification: KycVerificationEntity | null = null;

      if (aadharNumber) {
        const aadhaarRes = await this.saveBeneficiaryAadhaarInternal(
          userId,
          {
            aadharNumber,
            aadharFrontImage: '',
            aadharBackImage: '',
          },
          dto.beneficiary_name,
          queryRunner
        );
        aadhaarVerification = aadhaarRes?.aadhaarVerification || null;
      }

      /** 3️⃣ Verify bank account or UPI and add beneficiary inside transaction */
      let beneResult: any;

      if (dto.type === BeneficiaryType.BANK) {
        beneResult = await this.verifyAndAddBankBeneficiary(
          userId,
          dto,
          queryRunner,
          panVerification,
          aadhaarVerification
        );
      } else if (dto.type === BeneficiaryType.UPI) {
        beneResult = await this.verifyAndAddUpiBeneficiary(
          userId,
          dto,
          queryRunner,
          panVerification,
          aadhaarVerification
        );
      } else {
        throw new BusinessException(ERROR_CODES.KYC.INVALID_BENEFICIARY_TYPE);
      }

      const beneficiary = beneResult.beneficiary;

      await this.beneficiaryRepository.updateById(
        beneficiary.id,
        {
          otp: encryptedOtp,
          otp_expiry: otpExpiry,
          otp_attempt_count: 0,
        },
        queryRunner
      );

      return {
        beneficiaryId: beneficiary.id,
        metadata: beneResult.metadata,
      };
    });

    if (!isProd) {
      const smsResult = await this.smsService.sendParticipationOTPSms({
        type: OtpAttemptType.BENEFICIARY,
        mobile,
        otp: otpPlain,
        userId: user.id,
      });

      if (!smsResult || smsResult.status !== 'success') {
        throw new BusinessException(ERROR_CODES.AUTH.OTP_SEND_FAILED);
      }
    }

    return {
      verified: false,
      message: 'Beneficiary added successfully. OTP sent for verification.',
      details: {
        id: result.beneficiaryId,
        ...result.metadata,
        otp_expiry_in_minutes: Math.ceil(expirySeconds / 60),
      },
    };
  }

  /**
   * Verify OTP along with beneficiary_id
   *
   * @param userId
   * @param dto
   * @returns
   */
  async verifyBeneficiaryOtp(userId: number, dto: VerifyBeneficiaryOtpDto): Promise<any> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      id: dto.beneficiaryId,
      user: { id: userId },
      active: true,
    });

    if (!beneficiary) {
      throw new BusinessException(ERROR_CODES.KYC.BENEFICIARY_NOT_FOUND);
    }

    if (beneficiary.status === BeneficiaryStatus.VERIFIED) {
      return {
        verified: true,
        message: 'Beneficiary is already verified',
        details: {
          id: beneficiary.id,
          status: beneficiary.status,
          ...(beneficiary.metadata.accountNumber
            ? { accountNumber: beneficiary.metadata.accountNumber }
            : {}),
          ...(beneficiary.metadata.ifsc ? { ifscCode: beneficiary.metadata.ifsc } : {}),
          ...(beneficiary.metadata.upi ? { upi: beneficiary.metadata.upi } : {}),
          ...(beneficiary.metadata.bankHolderName
            ? { bankHolderName: beneficiary.metadata.bankHolderName }
            : {}),
        },
      };
    }

    if (Number(beneficiary.otp_attempt_count) >= MAX_OTP_VERIFY_ATTEMPTS) {
      throw new BusinessException(ERROR_CODES.AUTH.TOO_MANY_REQUESTS);
    }

    if (!beneficiary.otp || beneficiary.otp !== CommonUtils.encrypt(dto.otp)) {
      await this.beneficiaryRepository.updateById(beneficiary.id, {
        otp_attempt_count: Number(beneficiary.otp_attempt_count) + 1,
      });

      throw new BusinessException(ERROR_CODES.AUTH.INVALID_OTP);
    }

    if (OtpHelper.isOtpExpired(beneficiary.otp_expiry)) {
      throw new BusinessException(ERROR_CODES.AUTH.OTP_EXPIRED);
    }

    beneficiary.otp = null;
    beneficiary.otp_expiry = null;
    beneficiary.otp_attempt_count = 0;
    beneficiary.status = BeneficiaryStatus.VERIFIED;

    await this.beneficiaryRepository.save(beneficiary);

    return {
      verified: true,
      message: 'Beneficiary verified successfully',
      details: {
        id: beneficiary.id,
        status: beneficiary.status,

        ...(beneficiary.metadata.accountNumber
          ? { accountNumber: beneficiary.metadata.accountNumber }
          : {}),
        ...(beneficiary.metadata.ifsc ? { ifscCode: beneficiary.metadata.ifsc } : {}),
        ...(beneficiary.metadata.upi ? { upi: beneficiary.metadata.upi } : {}),
        ...(beneficiary.metadata.bankHolderName
          ? { bankHolderName: beneficiary.metadata.bankHolderName }
          : {}),
      },
    };
  }

  /**
   * Resend OTP for the Beneficiary ID in PENDING STATUS
   *
   * @param userId
   * @param dto
   * @returns
   */
  async resendBeneficiaryOtp(userId: number, dto: ResendBeneficiaryOtpDto): Promise<any> {
    const beneficiary = await this.beneficiaryRepository.findOne({
      id: dto.beneficiaryId,
      user: { id: userId },
      active: true,
    });

    if (!beneficiary) {
      throw new BusinessException(ERROR_CODES.KYC.BENEFICIARY_NOT_FOUND);
    }

    if (beneficiary.status === BeneficiaryStatus.VERIFIED) {
      throw new BusinessException(ERROR_CODES.KYC.BENEFICIARY_ALREADY_VERIFIED);
    }

    const user = await this.userAuthValidator.validateActiveUserById(userId);
    const mobile = beneficiary.mobileNumber
      ? this.decryptKycData(beneficiary.mobileNumber)
      : user.mobile;

    const otpValidation = await this.userValidator.validateOtpAttempts({
      mobile,
      otpType: OtpAttemptType.BENEFICIARY,
      userRole: user.role?.name,
      userId: user.id,
      increment: true,
    });

    let otpPlain = await OtpHelper.generateOtp();
    const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();

    if (!isProd) {
      otpPlain = this.appConfigService.getNonProdOtp().toString();
    }

    const expirySeconds = otpValidation.expirySeconds;
    const otpExpiry = OtpHelper.generateExpiryDate(expirySeconds);
    const encryptedOtp = CommonUtils.encrypt(otpPlain);

    beneficiary.otp = encryptedOtp;
    beneficiary.otp_expiry = otpExpiry;
    beneficiary.otp_attempt_count = 0;

    await this.beneficiaryRepository.save(beneficiary);

    if (!isProd) {
      const smsResult = await this.smsService.sendParticipationOTPSms({
        type: OtpAttemptType.BENEFICIARY,
        mobile,
        otp: otpPlain,
        userId: user.id,
      });

      if (!smsResult || smsResult.status !== 'success') {
        throw new BusinessException(ERROR_CODES.AUTH.OTP_SEND_FAILED);
      }
    }

    return {
      message: 'OTP sent for beneficiary verification',
      details: {
        id: beneficiary.id,
        otp_expiry_in_minutes: Math.ceil(expirySeconds / 60),
      },
    };
  }

  async getUserBeneficiaries(userId: number): Promise<any[]> {
    const list = await this.beneficiaryRepository.findUserBeneficiaries(userId);

    return list.map((item) => {
      const extraFields = {
        relationship: item.relationship ? this.decryptKycData(item.relationship) : null,
        beneficiary_name: item.beneficiary_name ? this.decryptKycData(item.beneficiary_name) : null,
        mobileNumber: item.mobileNumber ? this.decryptKycData(item.mobileNumber) : null,
        panNumber: item.panNumber ? this.decryptKycData(item.panNumber) : null,
        aadhaarNumber: item.aadhaarNumber ? this.decryptKycData(item.aadhaarNumber) : null,
        address: item.address ? this.decryptKycData(item.address) : null,
      };

      if (item.type === BeneficiaryType.BANK) {
        return {
          id: item.id,
          type: item.type,
          accountNumber: item.accountNumber ? this.decryptKycData(item.accountNumber) : null,
          ifsc: item.ifsc ? this.decryptKycData(item.ifsc) : null,
          bankName: item.bankName ? this.decryptKycData(item.bankName) : null,
          bankHolderName: item.bankHolderName ? this.decryptKycData(item.bankHolderName) : null,
          ...extraFields,
          status: item.status,
          createdAt: item.createdAt,
        };
      } else {
        return {
          id: item.id,
          type: item.type,
          upi: item.upi ? this.decryptKycData(item.upi) : null,
          ...extraFields,
          status: item.status,
          createdAt: item.createdAt,
        };
      }
    });
  }

  async getBeneficiaryRelationships() {
    return Object.entries(BeneficiaryRelationshipTypeLabels).map((item) => ({
      key: item[0],
      label: item[1],
    }));
  }

  /**
   * Soft Delete Beneficiary and its related PAN and Aadhaar KYC Verifications
   *
   * @param userId
   * @param beneficiaryId
   */
  async deleteBeneficiary(userId: number, beneficiaryId: number): Promise<any> {
    const tag = 'KycService.deleteBeneficiary';

    ConsoleLogger.log('DELETE_BENEFICIARY_START', {
      tag,
      data: { userId, beneficiaryId },
    });

    await this.userAuthValidator.validateActiveUserById(userId);

    await this.transactionService.runInTransaction(async (queryRunner) => {
      const beneficiary = await this.beneficiaryRepository.findActiveBeneficiaryWithVerifications(
        beneficiaryId,
        userId,
        queryRunner
      );

      if (!beneficiary) {
        throw new BusinessException(ERROR_CODES.KYC.BENEFICIARY_NOT_FOUND);
      }

      await this.beneficiaryRepository.softDeleteBeneficiary(beneficiaryId, userId, queryRunner);

      if (beneficiary.panVerification?.id) {
        await this.kycVerificationRepository.softDeleteKycVerification(
          beneficiary.panVerification.id,
          queryRunner
        );
      }

      if (beneficiary.aadhaarVerification?.id) {
        await this.kycVerificationRepository.softDeleteKycVerification(
          beneficiary.aadhaarVerification.id,
          queryRunner
        );
      }
    });

    ConsoleLogger.log('DELETE_BENEFICIARY_SUCCESS', {
      tag,
      data: { userId, beneficiaryId },
    });

    return {
      message: 'Beneficiary deleted successfully.',
    };
  }
}
