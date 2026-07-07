import { Injectable } from '@nestjs/common';
//
import {
  UserRepository,
  RolesRepository,
  ApprovalRepository,
  UserStoreInfoRepository,
  KycVerificationRepository,
} from 'src/default/common/repositories';
import { User } from '../auth/entities/users.entity';
import { SaveBasicInfoDto } from './dto/basic-info.dto';
import { SaveStoreInfoDto } from './dto/store-info.dto';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserStatus } from '../auth/constants/auth.constants';
import { KycType, KycStatus } from 'src/default/common/enums/kyc.enum';
import { BusinessException } from 'src/default/error/business.exception';
import { UserPartnerType, UserRole } from 'src/default/common/enums/user-type.enum';
import { ApprovalStatus, ApprovalType } from 'src/default/common/enums/approvals.enum';

@Injectable()
export class OnboardingService {
  private BASIC_INFO_FIELDS = {
    required: ['username', 'partnerType'],
    optional: ['email', 'whatsappNumber'],
  };

  constructor(
    private readonly userRepository: UserRepository,
    private readonly userStoreInfoRepository: UserStoreInfoRepository,
    private readonly approvalRepository: ApprovalRepository,
    private readonly kycVerificationRepository: KycVerificationRepository,
    private readonly roleRepository: RolesRepository
  ) {}

  async saveBasicInfo(userId: number, dto: SaveBasicInfoDto) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    // Check email uniqueness
    if (dto.email) {
      const existingUserWithEmail = await this.userRepository.findByEmail(dto.email);

      if (existingUserWithEmail && Number(existingUserWithEmail.id) !== userId) {
        throw new BusinessException(ERROR_CODES.ONBOARD.EMAIL_ALREADY_USED);
      }
    }

    // Check whatsapp uniqueness
    if (dto.whatsappNumber) {
      const existingUserWithWhatsapp = await this.userRepository.findOne({
        whatsappNumber: dto.whatsappNumber,
      });

      if (existingUserWithWhatsapp && Number(existingUserWithWhatsapp.id) !== userId) {
        throw new BusinessException(ERROR_CODES.ONBOARD.WHATSAPP_NUMBER_ALREADY_USED);
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
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const userStoreStatus = await this.getStatus(user.id);

    if (userStoreStatus.storeInfoComplete) {
      throw new BusinessException(ERROR_CODES.ONBOARD.INCOMPLETE_STORE_INFO);
    }

    // Check if store info already exists
    let storeInfo = await this.userStoreInfoRepository.findOne({ user: { id: userId } });

    /**
     * If store info exists only update the incoming fields from body
     */
    if (storeInfo) {
      if (dto.lat) {
        storeInfo.lat = dto.lat;
      }

      if (dto.lng) {
        storeInfo.lng = dto.lng;
      }

      if (dto.address1) {
        storeInfo.address1 = dto.address1;
      }

      if (dto.address2) {
        storeInfo.address2 = dto.address2;
      }

      if (dto.pincode) {
        storeInfo.pincode = dto.pincode;
      }

      if (dto.city) {
        storeInfo.city = dto.city;
      }

      if (dto.storeFrontFacadeImageUrl) {
        storeInfo.storeFrontFacadeImageUrl = dto.storeFrontFacadeImageUrl;
      }

      if (dto.storeDisplayImageUrl) {
        storeInfo.storeDisplayImageUrl = dto.storeDisplayImageUrl;
      }

      if (dto.addressProofType) {
        storeInfo.addressProofType = dto.addressProofType;
      }

      if (dto.addressProofImageUrl) {
        storeInfo.addressProofImageUrl = dto.addressProofImageUrl;
      }

      await this.userStoreInfoRepository.updateById(storeInfo.id, storeInfo);
    } else {
      /**
       * Create store info with the incoming fields if no store info provided
       */
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
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
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
      throw new BusinessException(ERROR_CODES.ONBOARD.INCOMPLETE_BASIC_INFO);
    }

    if (!status.panKycComplete) {
      throw new BusinessException(ERROR_CODES.ONBOARD.INCOMPLETE_PAN_KYC);
    }

    if (status.partnerType === UserPartnerType.ENTITY) {
      if (!status.gstKycComplete) {
        throw new BusinessException(ERROR_CODES.ONBOARD.INCOMPLETE_GST_KYC);
      }
      if (!status.storeInfoComplete) {
        throw new BusinessException(ERROR_CODES.ONBOARD.INCOMPLETE_STORE_INFO);
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
