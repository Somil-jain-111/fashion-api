import { Injectable } from '@nestjs/common';
import { KycTypeFiltered } from 'src/default/common/enums/kyc.enum';
import { AppConfigService } from 'src/default/config/config.service';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { ApproveKycDto } from './dto';
import { UserRepository } from '../user/repository';
import { KycVerificationRepository } from '../auth/repository';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { KycService } from '../kyc/kyc.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly kycService: KycService,
    private readonly appConfigService: AppConfigService,

    private readonly userRepository: UserRepository,
    private readonly kycVerificationRepository: KycVerificationRepository
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
}
