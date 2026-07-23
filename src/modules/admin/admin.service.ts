import { Injectable } from '@nestjs/common';
//
import { KycVerificationRepository } from '../kyc/repository';
import { KycService } from '../kyc/kyc.service';
import { AdminVerifyKycDto } from './dto/admin-verify-kyc.dto';
import { KycTypeFiltered } from 'src/default/common/enums/kyc.enum';
import { BusinessException } from 'src/default/error/business.exception';
import { UserRepository } from '../auth/repository';
import { ReferenceIdUtil } from 'src/default/common/utils/reference-id.util';
import { ERROR_CODES } from 'src/default/error/error.code';

@Injectable()
export class AdminService {
  constructor(
    private readonly kycService: KycService,
    private readonly userRepository: UserRepository,
    private readonly kycVerificationRepository: KycVerificationRepository
  ) {}

  /**
   * Directly creates a verified KYC record in the database for the given userId with dummy data.
   */
  async verifyKyc(dto: AdminVerifyKycDto): Promise<any> {
    const { userId, type } = dto;

    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      throw new BusinessException({
        code: 'ADMIN_001',
        message: `User with ID ${userId} not found`,
        statusCode: 404,
      });
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

    const transactionId = await ReferenceIdUtil.generateKycReferenceId(type);

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
      provider: 'ADMIN_BYPASS',
      providerRequest: { adminBypass: true, userId, type: type },
      providerResponse: {
        adminBypass: true,
        message: 'Dummy verified KYC record created by SuperAdmin',
      },
      metadata: {
        adminBypass: true,
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
}
