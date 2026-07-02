import { Injectable } from '@nestjs/common';
import { VerifyPanDto } from './dto/verify-pan.dto';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  UserRepository,
} from 'src/default/common/repositories';
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
import { LocalStorageContextUtil } from 'src/default/common/utils/local-storage.util';
import { ContextType } from 'src/default/common/constants/context.option';

@Injectable()
export class KycService {
  constructor(
    // private userRepository: UserRepository,
    private kycVerificationRepository: KycVerificationRepository,
    private kycVerificationLogRepository: KycVerificationLogRepository,
    private userAuthValidator: UserAuthValidator,
    private nameMatchProvider: NameMatchProvider,
    private panProvider: PanProvider,
    private aadhaarProvider: AadhaarProvider,
    private readonly configService: AppConfigService

    // private readonly AuthTokenHelper,
  ) {}
  // src/modules/kyc/service/kyc.service.ts

  private encryptKycData(value: any): any {
    const secretKey = this.configService.get('KYC_ENCRYPTION_SECRET_KEY');
    const fixedIv = this.configService.get('KYC_ENCRYPTION_FIXED_IV');

    return KycEncryptionHelper.encrypt(value, secretKey, fixedIv);
  }

  private decryptKycData(value: any): any {
    const secretKey = this.configService.get('KYC_ENCRYPTION_SECRET_KEY');
    const fixedIv = this.configService.get('KYC_ENCRYPTION_FIXED_IV');

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
    const user = await this.userAuthValidator.validateActiveUserById(userId);

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
    const transactionId = await ReferenceIdUtil.generateKycReferenceId('AADHAAR');

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
    const user = await this.userAuthValidator.validateActiveUserById(userId);

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
      console.log('ssssssssssss');
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
    let uploadedAadhaarImage: string | null = null;

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
    const encryptedProviderResponse = this.encryptKycData(providerResult.responseData);
    const encryptedProfileImage = this.encryptKycData(uploadedAadhaarImage || '');
    const encryptedVerifiedName = this.encryptKycData(
      aadhaarData.full_name || aadhaarData.name || user.username
    );

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.AADHAAR,
      referenceId,
      documentNumber: otpLog.documentNumber,
      maskedDocumentNumber: aadhaarData.masked_aadhaar || aadhaarData.maskedAadhaar || null,
      verifiedName: encryptedVerifiedName,
      provider: 'REWARDS_API',
      providerRequest: {
        referenceId,
        referenceIdOtp,
        otp: '******',
      },
      providerResponse: encryptedProviderResponse,
      metadata: {
        profileImage: encryptedProfileImage,
        dob: aadhaarData.dob ? this.encryptKycData(aadhaarData.dob) : null,
        gender: aadhaarData.gender ? this.encryptKycData(aadhaarData.gender) : null,
        address: aadhaarData.address ? this.encryptKycData(aadhaarData.address) : null,
      },
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
    };
  }
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

    const user = await this.userAuthValidator.validateActiveUserById(userId);

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

    const transactionId = await ReferenceIdUtil.generateKycReferenceId('PAN');

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
      apiUserName: user.username,
      transactionId: await ReferenceIdUtil.generateKycReferenceId('NAME_MATCH'),
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

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.PAN,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      verifiedName: encryptedUserName,
      provider: 'REWARDS_API',
      providerRequest: panProviderResult.requestPayload,
      providerResponse: encryptedApiData,
      metadata: {
        matchScore,
        panImage: encryptedPanImage,
        aadhaarLinked: panApiData?.aadhaar_linked,
      },
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
      matchScore,
    };
  }
}
