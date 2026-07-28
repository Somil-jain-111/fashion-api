import { Injectable } from '@nestjs/common';
//
import {
  UserRepository,
  RolesRepository,
  UserStoreInfoRepository,
} from 'src/modules/auth/repository';
import { ApprovalRepository } from 'src/modules/approvals/repository';
import { KycVerificationRepository } from 'src/modules/kyc/repository';
import { User } from '../auth/entities/users.entity';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserStatus } from '../auth/constants/auth.constants';
import { KycType } from 'src/default/common/enums/kyc.enum';
import { BusinessException } from 'src/default/error/business.exception';
import { UserPartnerType, UserRole } from 'src/default/common/enums/user-type.enum';
import { ApprovalStatus, ApprovalType } from 'src/default/common/enums/approvals.enum';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { AppConfigService } from 'src/default/config/config.service';
import {
  VerifyLocationQueryDto,
  SaveBasicInfoDto,
  SaveStoreInfoDto,
  ConfirmEmailOtpDto,
  ConfirmWhatsappOtpDto,
  SendEmailOtpDto,
  SendWhatsappOtpDto,
} from './dto';
import { LocationVerificationHelper } from 'src/default/common/helper/location-verification.helper';

const CONTACT_OTP_EXPIRY_MINUTES = 5;

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
    private readonly roleRepository: RolesRepository,
    private readonly appConfigService: AppConfigService,
    private readonly locationVerificationHelper: LocationVerificationHelper
  ) {}

  private resolveCurrentStep(user: any, activeApproval: any): string {
    // Check user status first — it's the source of truth
    if (user.status === UserStatus.ACTIVE) return 'ACTIVE';
    if (user.status === UserStatus.BLOCKED) return 'BLOCKED';

    if (!activeApproval) {
      if (!user.username || !user.partnerType) return 'BASIC_INFO';
      if (!user.storeInformation) return 'STORE_INFO';
      return 'SUBMIT';
    }

    if (activeApproval.level === 1) return 'PENDING_L1_REVIEW';
    if (activeApproval.level === 2) return 'PENDING_L2_REVIEW';
    if (activeApproval.level === 3) return 'PENDING_SO_VISIT';

    return 'UNKNOWN';
  }

  private async validatePincode(pincode: string, lat: number, lng: number) {
    // Verify using Google
    let verificationResponse = await this.locationVerificationHelper.getLocationByGoogle(lat, lng);

    let responsePincode = verificationResponse?.data?.pincode;

    // Verify using OSM (Fallback)
    if (!responsePincode) {
      verificationResponse = await this.locationVerificationHelper.getLocationByOSM(lat, lng);
      responsePincode = verificationResponse?.data?.pincode;
    }

    const isValidPincode = Number(responsePincode) === Number(pincode);

    return {
      isValidPincode: isValidPincode,
      details: verificationResponse.data,
    };
  }

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

    // Reset verification flags if contact details changed
    const whatsappChanged = dto.whatsappNumber && dto.whatsappNumber !== user.whatsappNumber;
    const emailChanged = dto.email && dto.email !== user.email;

    const updatedData = await this.userRepository.updateById(userId, {
      username: dto.name,
      partnerType: dto.partnerType,
      ...(dto.email && { email: dto.email }),
      ...(dto.whatsappNumber && { whatsappNumber: dto.whatsappNumber }),
      // Reset whatsapp verification if number changed
      ...(whatsappChanged && {
        whatsappVerified: false,
        whatsappOtp: null,
        whatsappOtpExpiry: null,
      }),
      // Reset email verification if email changed
      ...(emailChanged && {
        emailVerified: false,
        emailOtp: null,
        emailOtpExpiry: null,
      }),
    } as any);

    return updatedData;
  }

  async saveStoreInfo(userId: number, dto: SaveStoreInfoDto) {
    const user = await this.userRepository.findById(userId, ['storeInformation']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    // const userStoreStatus = await this.getStatus(user.id);

    // if (userStoreStatus.storeInfoComplete) {
    //   return {
    //     message: ERROR_CODES.ONBOARD.STORE_INFO_COMPLETED.message,
    //     data: user.storeInformation,
    //   };
    //   // throw new BusinessException(ERROR_CODES.ONBOARD.INCOMPLETE_STORE_INFO);
    // }

    // Check if store info already exists
    let storeInfo = await this.userStoreInfoRepository.findOne({ user: { id: userId } });

    const targetLat = dto.lat ?? storeInfo?.lat;
    const targetLng = dto.lng ?? storeInfo?.lng;
    const targetPincode = dto.pincode ?? storeInfo?.pincode;

    if (targetLat && targetLng && targetPincode) {
      const locationVerification = await this.validatePincode(
        String(targetPincode),
        targetLat,
        targetLng
      );

      if (!locationVerification?.isValidPincode) {
        throw new BusinessException(ERROR_CODES.ONBOARD.LOCATION_PINCODE_MISMATCH);
      }
    }

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
      data: storeInfo,
    };
  }

  // async getStatus(userId: number) {
  //   const user = await this.userRepository.findOne({ id: userId }, ['storeInformation']);

  //   if (!user) {
  //     throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
  //   }

  //   const basicInfoComplete = !!(user.username && user.partnerType);

  //   const panKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
  //     userId,
  //     KycType.PAN
  //   );
  //   const panKycComplete = !!panKyc;

  //   let gstKycComplete = false;
  //   let storeInfoComplete = false;

  //   if (user.partnerType === UserPartnerType.ENTITY) {
  //     const gstKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
  //       userId,
  //       KycType.GST
  //     );
  //     gstKycComplete = !!gstKyc;
  //     storeInfoComplete = !!user.storeInformation;
  //   } else {
  //     // For individual, GST KYC and store info are not mandatory by flow description
  //     gstKycComplete = true;
  //     storeInfoComplete = true;
  //   }

  //   return {
  //     partnerType: user.partnerType,
  //     basicInfoComplete,
  //     panKycComplete,
  //     gstKycComplete,
  //     storeInfoComplete,
  //     overallStatus: user.status,
  //   };
  // }

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

    const aadhaarKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      userId,
      KycType.AADHAAR
    );

    const aadhaarKycComplete = !!aadhaarKyc;

    // let gstKycComplete = false;
    // Store info required regardless user is individual or entity
    const storeInfoComplete = !!user.storeInformation;

    // if (user.partnerType === UserPartnerType.ENTITY) {
    const gstKyc = await this.kycVerificationRepository.findVerifiedByUserIdAndType(
      userId,
      KycType.GST
    );
    const gstKycComplete = !!gstKyc;
    // } else {
    //   gstKycComplete = true;
    //   storeInfoComplete = true;
    // }

    // ---- Approval & routing info (merged from SO flow) ----
    const approvals = await this.approvalRepository.findByUserId(userId, ApprovalType.PROFILE);

    const activeApproval = approvals[0] ?? null;

    let currentRejection: {
      rejectedBy: string;
      reason: string;
      rejectedAt: Date | null;
    } | null = null;

    if (activeApproval?.status === ApprovalStatus.REJECTED) {
      currentRejection = {
        rejectedBy:
          activeApproval.level === 1 ? 'L1' : activeApproval.level === 2 ? 'L2' : 'Sales Officer',
        reason: activeApproval.remarks ?? 'Your profile was rejected.',
        rejectedAt: activeApproval.approved_at,
      };
    }

    let applicationId = user.applicationId;
    if (!applicationId) {
      applicationId = CommonUtils.generateApplicationId();
      await this.userRepository.updateById(userId, { applicationId });
    }

    const currentStep = this.resolveCurrentStep(user, activeApproval);

    return {
      userId,
      applicationId,
      partnerType: user.partnerType,
      basicInfoComplete,
      panKycComplete,
      gstKycComplete,
      aadhaarKycComplete,
      storeInfoComplete,
      overallStatus: user.status,
      // ---- New routing & approval fields ----
      currentStep,
      approvalStatus: activeApproval?.status ?? null,
      approvalLevel: activeApproval?.level ?? null,
      isSubmitted: !!activeApproval,
      currentRejection,
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
      applicationId: status.applicationId,
    };
  }

  async sendWhatsappOtp(userId: number, dto: SendWhatsappOtpDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);

    // Check number isn't already taken by another user
    const existing = await this.userRepository.findOne({
      whatsappNumber: dto.whatsappNumber,
    });
    if (existing && Number(existing.id) !== userId) {
      throw new BusinessException({
        code: 'VERIFY_001',
        message: 'This WhatsApp number is already in use by another account.',
        statusCode: 409,
      });
    }

    const isLive = this.appConfigService.isProduction() || this.appConfigService.isQa();
    const otp = isLive
      ? Math.floor(1000 + Math.random() * 9000).toString()
      : this.appConfigService.getNonProdOtp().toString();

    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + CONTACT_OTP_EXPIRY_MINUTES);

    // Update whatsapp number + store OTP + reset verified flag
    await this.userRepository.updateById(userId, {
      whatsappNumber: dto.whatsappNumber,
      whatsappOtp: otp,
      whatsappOtpExpiry: otpExpiry,
      whatsappVerified: false,
    } as any);

    // Send via WhatsApp service
    if (isLive) {
      await CommonUtils.sendWhatsappOtp({
        mobile: dto.whatsappNumber,
        otp,
        name: user.username ?? undefined,
      });
    }

    return {
      message: `OTP sent to WhatsApp number ${dto.whatsappNumber}`,
      expiresInMinutes: CONTACT_OTP_EXPIRY_MINUTES,
      ...(isLive ? {} : { otp }), // expose OTP in non-prod for testing
    };
  }

  async confirmWhatsappOtp(userId: number, dto: ConfirmWhatsappOtpDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);

    if (!(user as any).whatsappOtp) {
      throw new BusinessException({
        code: 'VERIFY_002',
        message: 'No OTP found. Please request a new OTP first.',
        statusCode: 400,
      });
    }

    // Expiry check
    const expiry = (user as any).whatsappOtpExpiry;
    if (!expiry || new Date() > new Date(expiry)) {
      throw new BusinessException({
        code: 'VERIFY_003',
        message: 'OTP has expired. Please request a new one.',
        statusCode: 400,
      });
    }

    // OTP match check
    if ((user as any).whatsappOtp !== dto.otp) {
      throw new BusinessException({
        code: 'VERIFY_004',
        message: 'Invalid OTP. Please try again.',
        statusCode: 400,
      });
    }

    // Mark verified, clear OTP
    await this.userRepository.updateById(userId, {
      whatsappVerified: true,
      whatsappOtp: null,
      whatsappOtpExpiry: null,
    } as any);

    return {
      message: 'WhatsApp number verified successfully.',
      whatsappNumber: user.whatsappNumber,
      verified: true,
    };
  }

  // ── Email ─────────────────────────────────────────────────────────────────────

  async sendEmailOtp(userId: number, dto: SendEmailOtpDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);

    // Check email isn't already taken by another user
    const existing = await this.userRepository.findOne({ email: dto.email });
    if (existing && Number(existing.id) !== userId) {
      throw new BusinessException({
        code: 'VERIFY_005',
        message: 'This email address is already in use by another account.',
        statusCode: 409,
      });
    }

    const isLive = this.appConfigService.isProduction() || this.appConfigService.isQa();
    const otp = isLive
      ? Math.floor(1000 + Math.random() * 9000).toString()
      : this.appConfigService.getNonProdOtp().toString();

    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + CONTACT_OTP_EXPIRY_MINUTES);

    // Update email + store OTP + reset verified flag
    await this.userRepository.updateById(userId, {
      email: dto.email,
      emailOtp: otp,
      emailOtpExpiry: otpExpiry,
      emailVerified: false,
    } as any);

    // Send via email service
    if (isLive) {
      await CommonUtils.sendEmailOtp({
        email: dto.email,
        otp,
        name: user.username ?? undefined,
      });
    }

    return {
      message: `OTP sent to ${dto.email}`,
      expiresInMinutes: CONTACT_OTP_EXPIRY_MINUTES,
      ...(isLive ? {} : { otp }),
    };
  }

  async confirmEmailOtp(userId: number, dto: ConfirmEmailOtpDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);

    if (!(user as any).emailOtp) {
      throw new BusinessException({
        code: 'VERIFY_006',
        message: 'No OTP found. Please request a new OTP first.',
        statusCode: 400,
      });
    }

    const expiry = (user as any).emailOtpExpiry;
    if (!expiry || new Date() > new Date(expiry)) {
      throw new BusinessException({
        code: 'VERIFY_007',
        message: 'OTP has expired. Please request a new one.',
        statusCode: 400,
      });
    }

    if ((user as any).emailOtp !== dto.otp) {
      throw new BusinessException({
        code: 'VERIFY_008',
        message: 'Invalid OTP. Please try again.',
        statusCode: 400,
      });
    }

    await this.userRepository.updateById(userId, {
      emailVerified: true,
      emailOtp: null,
      emailOtpExpiry: null,
    } as any);

    return {
      message: 'Email verified successfully.',
      email: user.email,
      verified: true,
    };
  }

  /**
   * Verify location by pincode with LAT & LNG
   *
   * @param body
   * @returns
   */
  async verifyLocationByPincode(body: VerifyLocationQueryDto) {
    const { pincode, lat, lng } = body;

    return await this.validatePincode(pincode, lat, lng);
  }
}
