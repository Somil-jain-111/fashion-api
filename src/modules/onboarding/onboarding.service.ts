import { Injectable } from '@nestjs/common';
import {
  UserRepository,
  UserStoreInfoRepository,
  ApprovalRepository,
  KycVerificationRepository,
  RolesRepository,
} from 'src/default/common/repositories';
import { SaveBasicInfoDto } from './dto/basic-info.dto';
import { SaveStoreInfoDto } from './dto/store-info.dto';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserStatus } from '../auth/constants/auth.constants';
import { KycType, KycStatus } from 'src/default/common/enums/kyc.enum';
import { UserPartnerType, UserRole } from 'src/default/common/enums/user-type.enum';
import { ApprovalStatus, ApprovalType } from 'src/default/common/enums/approvals.enum';
import { User } from '../auth/entities/users.entity';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userStoreInfoRepository: UserStoreInfoRepository,
    private readonly approvalRepository: ApprovalRepository,
    private readonly kycVerificationRepository: KycVerificationRepository,
    private readonly roleRepository: RolesRepository,
  ) {}

  async saveBasicInfo(userId: number, dto: SaveBasicInfoDto) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BusinessException(
        ERROR_CODES.USER.USER_NOT_FOUND || {
          code: 'USER_404',
          message: 'User not found',
          statusCode: 404,
        }
      );
    }

    // Check email uniqueness
    if (dto.email) {
      const existingUserWithEmail = await this.userRepository.findByEmail(dto.email);

      if (existingUserWithEmail && Number(existingUserWithEmail.id) !== userId) {
        throw new BusinessException({
          code: 'AUTH_009',
          message: 'Email address already in use',
          statusCode: 400,
        });
      }
    }

    // Resolve whatsapp number: default to mobile if not provided
    // let whatsappNumber = dto.whatsappNumber;

    // if (!whatsappNumber) {
    //   whatsappNumber = user.mobile;
    // }

    // Check whatsapp uniqueness
    if (dto.whatsappNumber) {
      const existingUserWithWhatsapp = await this.userRepository.findOne({
        whatsappNumber: dto.whatsappNumber,
      });

      if (existingUserWithWhatsapp && Number(existingUserWithWhatsapp.id) !== userId) {
        throw new BusinessException({
          code: 'AUTH_010',
          message: 'WhatsApp number already in use',
          statusCode: 400,
        });
      }
    }

    // Update user basic info
    const updatedData = await this.userRepository.updateById(userId, {
      username: dto.name,
      partnerType: dto.partnerType,
      ...(dto.email && {
        email: dto.email,
      }),
      ...(dto.whatsappNumber && {
        whatsappNumber: dto.whatsappNumber,
      }),
    });

    return updatedData;
  }

  async saveStoreInfo(userId: number, dto: SaveStoreInfoDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BusinessException(
        ERROR_CODES.USER.USER_NOT_FOUND || {
          code: 'USER_404',
          message: 'User not found',
          statusCode: 404,
        }
      );
    }

    // Check if store info already exists
    let storeInfo = await this.userStoreInfoRepository.findOne({ user: { id: userId } });

    if (storeInfo) {
      await this.userStoreInfoRepository.updateById(storeInfo.id, {
        lat: dto.lat,
        lng: dto.lng,
        address1: dto.address1,
        address2: dto.address2 || null,
        pincode: dto.pincode,
        city: dto.city,
        state: dto.state,
        storeFrontFacadeImageUrl: dto.storeFrontFacadeImageUrl,
        storeDisplayImageUrl: dto.storeDisplayImageUrl,
        addressProofType: dto.addressProofType,
        addressProofImageUrl: dto.addressProofImageUrl || null,
      });
    } else {
      storeInfo = await this.userStoreInfoRepository.save({
        user: { id: userId } as any,
        lat: dto.lat,
        lng: dto.lng,
        address1: dto.address1,
        address2: dto.address2 || null,
        pincode: dto.pincode,
        city: dto.city,
        state: dto.state,
        storeFrontFacadeImageUrl: dto.storeFrontFacadeImageUrl,
        storeDisplayImageUrl: dto.storeDisplayImageUrl,
        addressProofType: dto.addressProofType,
        addressProofImageUrl: dto.addressProofImageUrl || null,
      });

      // Link store information to user
      await this.userRepository.updateById(userId, {
        storeInformation: { id: storeInfo.id } as any,
      });
    }

    return {
      message: 'Store info saved successfully',
    };
  }

  async getStatus(userId: number) {
    const user = await this.userRepository.findOne({ id: userId }, ['storeInformation']);

    if (!user) {
      throw new BusinessException(
        ERROR_CODES.USER.USER_NOT_FOUND || {
          code: 'USER_404',
          message: 'User not found',
          statusCode: 404,
        }
      );
    }

    const basicInfoComplete = !!(user.username && user.partnerType);

    const panKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      userId,
      KycType.PAN
    );
    const panKycComplete = !!panKyc;

    let gstKycComplete = false;
    let storeInfoComplete = false;

    if (user.partnerType === UserPartnerType.ENTITY) {
      const gstKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
        userId,
        KycType.GST
      );
      gstKycComplete = !!gstKyc;
      storeInfoComplete = !!user.storeInformation;
    } else {
      // For individual, GST KYC and store info are not mandatory by flow description
      gstKycComplete = true;
      storeInfoComplete = true;
    }

    return {
      partnerType: user.partnerType,
      basicInfoComplete,
      panKycComplete,
      gstKycComplete,
      storeInfoComplete,
      overallStatus: user.status,
    };
  }

  async submitProfile(userId: number) {
    const status = await this.getStatus(userId);

    if (!status.basicInfoComplete) {
      throw new BusinessException({
        code: 'ONBOARD_001',
        message: 'Please complete your basic profile information first.',
        statusCode: 400,
      });
    }

    if (!status.panKycComplete) {
      throw new BusinessException({
        code: 'ONBOARD_002',
        message: 'Please complete your PAN KYC verification first.',
        statusCode: 400,
      });
    }

    if (status.partnerType === UserPartnerType.ENTITY) {
      if (!status.gstKycComplete) {
        throw new BusinessException({
          code: 'ONBOARD_003',
          message: 'Please complete your GST KYC verification first.',
          statusCode: 400,
        });
      }
      if (!status.storeInfoComplete) {
        throw new BusinessException({
          code: 'ONBOARD_004',
          message: 'Please fill your user store information first.',
          statusCode: 400,
        });
      }
    }

    // Set user status to IN_APPROVAL (if not already)
    await this.userRepository.updateById(userId, { status: UserStatus.IN_APPROVAL });

    // Lookup global/next L1 assignee
    const l1Role = await this.roleRepository.findByName(UserRole.L1);

    let assignedToUser: User | null = null;

    if (l1Role) {
      const l1Users = await this.userRepository.findMany({
        where: { role: { id: l1Role.id } },
      });

      if (l1Users?.length > 0) {
        assignedToUser = l1Users[0]; // Currently assigns to the first L1 user found
      } else {
        throw new BusinessException(ERROR_CODES.APPROVAL.INVALID_LEVEL);
      }
    }

    // Create an Approval record of type PROFILE at level 1 (L1)
    await this.approvalRepository.save({
      user: { id: userId } as any,
      approval_type: ApprovalType.PROFILE,
      status: ApprovalStatus.PENDING,
      level: 1,
      assignedTo: assignedToUser ? ({ id: assignedToUser.id } as any) : null,
    });

    return {
      message: 'Profile submitted for L1 approval successfully',
    };
  }
}
