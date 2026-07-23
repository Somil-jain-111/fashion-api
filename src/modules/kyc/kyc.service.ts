import { Injectable } from '@nestjs/common';
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
import {
  BeneficiaryType,
  KycLogStatus,
  KycStatus,
  KycType,
} from 'src/default/common/enums/kyc.enum';
import { PanProvider } from './provider/pan.provider';
import { NameMatchProvider } from './provider/name-matching.provider';
import { GenerateAadharOtpDto } from './dto/generate-aadhar.dto';
import { AadhaarProvider } from './provider/aadhaar.provider';
import { VerifyAadhaarOtpDto } from './dto/verify-aadhar-otp.dto';
import { LocalStorageContextUtil } from 'src/default/common/utils/local-storage.util';
import { ContextType } from 'src/default/common/constants/context.option';
import { UserRepository } from '../auth/repository';
import { UserPartnerType } from 'src/default/common/enums/user-type.enum';

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
    private readonly appConfigService: AppConfigService
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

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.PAN,
      referenceId: transactionId,
      documentNumber: encryptedPan,
      verifiedName: encryptedUserName,
      provider: 'REWARDS_API',
      maskedDocumentNumber: this.panProvider.maskPanNumber(pan),
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

    const user = await this.userRepository.findOne({ id: Number(userId) });

    await this.userAuthValidator.validateUserStatus(user.status);

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

    const metadata = {
      tradeName: gstApiData.business_name,
      legalName: gstApiData.legal_name,
      address: gstApiData.address,
      status: gstApiData.gstin_status,
      dateOfRegistration: gstApiData.date_of_registration,
    };

    await this.kycVerificationRepository.upsertVerifiedKyc({
      userId: userId,
      type: KycType.GST,
      referenceId: transactionId,
      documentNumber: encryptedGst,
      maskedDocumentNumber: this.gstProvider.maskGstNumber(gst),
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
      ...metadata,
    };
  }

  /**
   * Bank/UPI Verification
   */

  private async verifyAndAddBankBeneficiary(userId: number, dto: AddBeneficiaryDto): Promise<any> {
    const tag = 'KycService.verifyAndAddBankBeneficiary';
    const { accountNumber, reEnterAccountNumber, ifsc, bankHolderName } = dto;

    const normalizedAccountNumber = accountNumber?.toUpperCase().trim() || '';
    const normalizedReEnterAccountNumber = reEnterAccountNumber?.toUpperCase().trim() || '';
    const normalizedIfsc = ifsc?.toUpperCase().trim() || '';
    const normalizedHolderName = bankHolderName?.trim() || '';

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

    /** 4️⃣ Check if Bank Account already exists for user */
    const isExist = await this.beneficiaryRepository.isAccountInfoExist(
      accountNumberENC,
      ifscENC,
      userId
    );

    if (isExist) {
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

    /** Log attempt */
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
      apiUserName: user.username,
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
    const [bankNameENC, providerResponseENC] = await Promise.all([
      this.encryptKycData(bankName || ''),
      this.encryptKycData(bankResult.responseData),
    ]);

    const beneficiary = await this.beneficiaryRepository.createBeneficiary({
      userId,
      type: BeneficiaryType.BANK,
      accountNumber: accountNumberENC,
      ifsc: ifscENC,
      bankName: bankNameENC,
      bankHolderName: bankHolderNameENC,
      status: 1,
      referenceId: transactionId,
      metadata: {
        matchScore,
        rawResponse: providerResponseENC,
      },
    });

    ConsoleLogger.log(`VERIFY_ACCOUNT_SUCCESS | userId: ${userId} | id: ${beneficiary.id}`, tag);

    return {
      verified: true,
      message: 'Bank account verified and saved successfully',
      beneficiaryId: beneficiary.id,
    };
  }

  private async verifyAndAddUpiBeneficiary(userId: number, dto: AddBeneficiaryDto): Promise<any> {
    const tag = 'KycService.verifyAndAddUpiBeneficiary';
    const { upi } = dto;
    const normalizedUpi = upi?.trim() || '';

    /** 1️⃣ Validate User */
    const user = await this.userAuthValidator.validateActiveUserById(userId);

    /** 2️⃣ Encrypt UPI for duplicate check & storage */
    const upiENC = this.encryptKycData(normalizedUpi);

    /** 3️⃣ Check if UPI already exists for user */
    const isExist = await this.beneficiaryRepository.isUpiExist(upiENC, userId);

    if (isExist) {
      ConsoleLogger.warn(`UPI_ALREADY_USED | userId: ${userId}`, tag);
      throw new BusinessException(ERROR_CODES.KYC.UPI_ALREADY_USED);
    }

    /** 4️⃣ Call 3rd-party UPI Verification API */
    const transactionId = await ReferenceIdUtil.generateKycReferenceId(KycType.UPI);

    const upiResult = await this.upiProvider.validateUpi({
      upi: normalizedUpi,
      transactionId,
    });

    /** Log attempt */
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
    const providerResponseENC = this.encryptKycData(upiResult.responseData);

    const beneficiary = await this.beneficiaryRepository.createBeneficiary({
      userId,
      type: BeneficiaryType.UPI,
      upi: upiENC,
      status: 1,
      referenceId: transactionId,
      metadata: {
        rawResponse: providerResponseENC,
      },
    });

    ConsoleLogger.log(`VERIFY_UPI_SUCCESS | userId: ${userId} | id: ${beneficiary.id}`, tag);

    return {
      verified: true,
      message: 'UPI verified and saved successfully',
      beneficiaryId: beneficiary.id,
    };
  }

  /**
   * Beneficiary Addition & Verification (Unified Entrypoint)
   */
  async addBeneficiary(userId: number, dto: AddBeneficiaryDto): Promise<any> {
    if (dto.type === BeneficiaryType.BANK) {
      return await this.verifyAndAddBankBeneficiary(userId, dto);
    } else if (dto.type === BeneficiaryType.UPI) {
      return await this.verifyAndAddUpiBeneficiary(userId, dto);
    }

    throw new BusinessException(ERROR_CODES.KYC.INVALID_BENEFICIARY_TYPE);
  }

  async getUserBeneficiaries(userId: number): Promise<any[]> {
    const list = await this.beneficiaryRepository.findUserBeneficiaries(userId);

    return list.map((item) => {
      if (item.type === BeneficiaryType.BANK) {
        return {
          id: item.id,
          type: item.type,
          accountNumber: item.accountNumber ? this.decryptKycData(item.accountNumber) : null,
          ifsc: item.ifsc ? this.decryptKycData(item.ifsc) : null,
          bankName: item.bankName ? this.decryptKycData(item.bankName) : null,
          bankHolderName: item.bankHolderName ? this.decryptKycData(item.bankHolderName) : null,
          status: item.status,
          createdAt: item.createdAt,
        };
      } else {
        return {
          id: item.id,
          type: item.type,
          upi: item.upi ? this.decryptKycData(item.upi) : null,
          status: item.status,
          createdAt: item.createdAt,
        };
      }
    });
  }
}
