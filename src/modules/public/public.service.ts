import { Injectable } from '@nestjs/common';
import { KycStatus, KycType, KycTypeFiltered } from 'src/default/common/enums/kyc.enum';
import {
  BeneficiaryType,
  BeneficiaryStatus,
  BeneficiaryRelationshipType,
} from 'src/default/common/enums/user-beneficiary.enum';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ApproveKycDto, ApproveBeneficiaryDto } from './dto';
import { UserRepository } from '../user/repository';
import { KycVerificationRepository } from '../auth/repository';
import { BeneficiaryRepository } from '../kyc/repository';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { KycService } from '../kyc/kyc.service';
import { UpiProvider } from '../kyc/provider/upi.provider';
import { BankProvider } from '../kyc/provider/bank.provider';
import { AadhaarProvider } from '../kyc/provider/aadhaar.provider';
import { PanProvider } from '../kyc/provider/pan.provider';

@Injectable()
export class PublicService {
  constructor(
    private readonly kycService: KycService,
    private readonly appConfigService: AppConfigService,

    private readonly userRepository: UserRepository,
    private readonly kycVerificationRepository: KycVerificationRepository,
    private readonly beneficiaryRepository: BeneficiaryRepository,
    private readonly upiProvider: UpiProvider,
    private readonly bankProvider: BankProvider,
    private readonly AadhaarProvider: AadhaarProvider,
    private readonly panProvider: PanProvider
  ) {}

  /**
   * Main public service that verifies KYC type for a user
   *
   * @param dto
   * @returns
   */
  async verifyManualKyc(dto: ApproveKycDto) {
    const { userId, type } = dto;

    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const existingKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      userId,
      type
    );

    if (existingKyc) {
      throw new BusinessException(ERROR_CODES.KYC.KYC_ALREADY_VERIFIED, {
        type,
      });
    }

    const transactionId = await CommonUtils.generateUniqueRefCode();

    let dummyDocNumber: string;
    let dummyMaskedDocNumber: string;

    if (type === KycTypeFiltered.PAN) {
      dummyDocNumber = 'ABCDE1234F';
      dummyMaskedDocNumber = 'XXXXXX1234';
    } else if (type === KycTypeFiltered.GST) {
      dummyDocNumber = '07AAAAA0000A1Z5';
      dummyMaskedDocNumber = '07XXXXXXXXXX1Z5';
    } else if (type === KycTypeFiltered.AADHAAR) {
      dummyDocNumber = '999988887777';
      dummyMaskedDocNumber = 'XXXXXXXX7777';
    }

    const encryptedDoc = this.kycService.encryptKycData(dummyDocNumber);
    const encryptedName = this.kycService.encryptKycData(user.username || 'Verified User');

    const result = await this.kycVerificationRepository.upsertVerifiedKyc({
      userId,
      type: type,
      referenceId: transactionId,
      documentNumber: encryptedDoc,
      maskedDocumentNumber: dummyMaskedDocNumber,
      verifiedName: encryptedName,
      provider: 'PUBLIC_VERIFY',
      providerRequest: { publicVerify: true, userId, type: type },
      providerResponse: {
        publicVerify: true,
        message: 'Dummy verified KYC record created by SuperAdmin',
      },
      metadata: {
        publicVerify: true,
        transactionId,
        verifiedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `${type} KYC verified successfully for user ${userId}`,
      transactionId,
      recordId: result.id,
      userId,
      type: type,
      status: result.status,
    };
  }

  /**
   * Main public service called from controller
   * Takes requestes, verifies secret and enviorment
   *
   * @param privateKey
   * @param userId
   * @param kycType
   * @returns
   */
  async approveManualKyc(privateKey: string, userId: number, kycType: KycTypeFiltered) {
    const kycKey = this.appConfigService.getKycSecretKey();
    const isProduction = this.appConfigService.isProduction() || this.appConfigService.isQa();

    if (isProduction) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Invalid environment for this action',
      });
    }

    if (privateKey !== kycKey) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Invalid Secret',
      });
    }

    return await this.verifyManualKyc({
      userId: userId,
      type: kycType,
    });
  }

  /**
   * Public service that fake adds and verifies a beneficiary (BANK or UPI) for a user.
   * Restricts adding more than one fake beneficiary per user.
   * Automatically adds mock BENE_PAN and BENE_AADHAAR records.
   * Bypasses OTP verification and marks status as VERIFIED.
   *
   * @param dto
   * @returns
   */
  async verifyManualBeneficiary(dto: ApproveBeneficiaryDto) {
    const { userId, type } = dto;

    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const userBeneficiaries = await this.beneficiaryRepository.findUserBeneficiaries(userId);
    const existingFakeBeneficiary = userBeneficiaries.find(
      (b) => b.metadata?.publicVerify === true
    );

    if (existingFakeBeneficiary) {
      throw new BusinessException(ERROR_CODES.KYC.BENEFICIARY_ALREADY_VERIFIED, {
        reason: 'Fake beneficiary already exists for this user',
      });
    }

    const transactionId = await CommonUtils.generateUniqueRefCode();

    const dummyPanNumber = 'ABCDE1234F';
    const dummyMaskedPanNumber = this.panProvider.maskPanNumber(dummyPanNumber);
    const dummyAadhaarNumber = '999988887777';
    const dummyMaskedAadhaarNumber = this.AadhaarProvider.maskAadhaarNumber(dummyAadhaarNumber);

    const encryptedPan = this.kycService.encryptKycData(dummyPanNumber);
    const encryptedAadhaar = this.kycService.encryptKycData(dummyAadhaarNumber);
    const encryptedName = this.kycService.encryptKycData(user.username || 'Verified User');

    const panVerification = await this.kycVerificationRepository.save({
      user: { id: user.id },
      type: KycType.BENE_PAN,
      referenceId: `${transactionId}_PAN`,
      documentNumber: encryptedPan,
      maskedDocumentNumber: dummyMaskedPanNumber,
      verifiedName: encryptedName,
      provider: 'PUBLIC_VERIFY',
      status: KycStatus.VERIFIED,
      providerRequest: { publicVerify: true, userId },
      providerResponse: {
        publicVerify: true,
        message: 'Dummy verified BENE_PAN record created by SuperAdmin',
      },
      metadata: {
        publicVerify: true,
        transactionId,
        maskedDocumentNumber: dummyMaskedPanNumber,
        verifiedAt: new Date().toISOString(),
      },
    });

    const aadhaarVerification = await this.kycVerificationRepository.save({
      user: { id: user.id },
      type: KycType.BENE_AADHAAR,
      referenceId: `${transactionId}_AADHAAR`,
      documentNumber: encryptedAadhaar,
      maskedDocumentNumber: dummyMaskedAadhaarNumber,
      verifiedName: encryptedName,
      provider: 'PUBLIC_VERIFY',
      status: KycStatus.VERIFIED,
      providerRequest: { publicVerify: true, userId },
      providerResponse: {
        publicVerify: true,
        message: 'Dummy verified BENE_AADHAAR record created by SuperAdmin',
      },
      metadata: {
        publicVerify: true,
        transactionId,
        maskedDocumentNumber: dummyMaskedAadhaarNumber,
        verifiedAt: new Date().toISOString(),
      },
    });

    let accountNumberENC: string | null = null;
    let ifscENC: string | null = null;
    let bankNameENC: string | null = null;
    let bankHolderNameENC: string | null = null;
    let upiENC: string | null = null;
    let beneMetadata: Record<string, any> = {};

    if (type === BeneficiaryType.BANK) {
      const rawAccountNumber = dto.accountNumber || '123456789012';
      const rawIfsc = dto.ifsc || 'SBIN0001234';
      const rawHolderName =
        dto.bankHolderName || dto.beneficiary_name || user.username || 'Verified User';
      const rawBankName = 'MOCK BANK';

      accountNumberENC = this.kycService.encryptKycData(rawAccountNumber);
      ifscENC = this.kycService.encryptKycData(rawIfsc);
      bankHolderNameENC = this.kycService.encryptKycData(rawHolderName);
      bankNameENC = this.kycService.encryptKycData(rawBankName);

      beneMetadata = {
        publicVerify: true,
        transactionId,
        verifiedAt: new Date().toISOString(),
        bankName: rawBankName,
        ...this.bankProvider.maskAccountDetails({
          accountNumber: rawAccountNumber,
          ifsc: rawIfsc,
          bankHolderName: rawHolderName,
        }),
      };
    } else if (type === BeneficiaryType.UPI) {
      const rawUpi = dto.upi || 'user@upi';
      upiENC = this.kycService.encryptKycData(rawUpi);

      beneMetadata = {
        publicVerify: true,
        transactionId,
        verifiedAt: new Date().toISOString(),
        upi: this.upiProvider.maskUpiId(rawUpi),
      };
    } else {
      throw new BusinessException(ERROR_CODES.KYC.INVALID_BENEFICIARY_TYPE);
    }

    const relationshipStr = dto.relationship || BeneficiaryRelationshipType.SELF;
    const nameStr = dto.beneficiary_name || user.username || 'Verified User';
    const mobileStr = dto.mobile || user.mobile || '9999999999';
    const addressStr = dto.address || null;

    const relationshipENC = this.kycService.encryptKycData(relationshipStr);
    const nameENC = this.kycService.encryptKycData(nameStr);
    const mobileNumberENC = this.kycService.encryptKycData(mobileStr);
    const addressENC = addressStr ? this.kycService.encryptKycData(addressStr) : null;

    const beneficiary = await this.beneficiaryRepository.createBeneficiary({
      userId,
      type,
      accountNumber: accountNumberENC,
      ifsc: ifscENC,
      bankName: bankNameENC,
      bankHolderName: bankHolderNameENC,
      upi: upiENC,
      relationship: relationshipENC,
      beneficiary_name: nameENC,
      mobileNumber: mobileNumberENC,
      panNumber: encryptedPan,
      aadhaarNumber: encryptedAadhaar,
      address: addressENC,
      status: BeneficiaryStatus.VERIFIED,
      referenceId: transactionId,
      panVerification: { id: panVerification.id } as any,
      aadhaarVerification: { id: aadhaarVerification.id } as any,
      metadata: beneMetadata,
      otp: null,
      otp_expiry: null,
      otp_attempt_count: 0,
    });

    return {
      success: true,
      verified: true,
      message: `Fake ${type} beneficiary added and verified successfully for user ${userId}`,
      transactionId,
      beneficiaryId: beneficiary.id,
      userId,
      type,
      status: beneficiary.status,
      metadata: beneMetadata,
    };
  }

  /**
   * Public service called from controller to approve fake beneficiary.
   * Verifies secret key and environment.
   *
   * @param privateKey
   * @param dto
   * @returns
   */
  async approveManualBeneficiary(privateKey: string, dto: ApproveBeneficiaryDto) {
    const kycKey = this.appConfigService.getKycSecretKey();
    const isProduction = this.appConfigService.isProduction() || this.appConfigService.isQa();

    if (isProduction) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Invalid environment for this action',
      });
    }

    if (privateKey !== kycKey) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Invalid Secret',
      });
    }

    return await this.verifyManualBeneficiary(dto);
  }
}
