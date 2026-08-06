import { Injectable } from '@nestjs/common';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { RolesRepository, UserRepository } from 'src/modules/auth/repository';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { SendOtpDto } from 'src/modules/auth/dto/send-otp.dto';

import { CommonUtils } from 'src/default/common/utils/common.utils';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { DynamicConfigRepository } from 'src/modules/dynamic-config/repository';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { UserRoleConfig } from 'src/modules/dynamic-config/entities';
import { OtpAttemptType } from '../enums/common.enum';

export interface ValidateOtpAttemptsOptions {
  mobile: string | number;
  otpType: OtpAttemptType;
  userRole?: UserRole | string;
  userId?: number | bigint | string;
  increment?: boolean;
}

export interface OtpConfigResult {
  maxAttempts: number;
  timeoutSeconds: number;
  expirySeconds: number;
}

@Injectable()
export class UserValidator {
  private readonly baseOTPAttemptsRedisKey = 'CAMPUS:OTP_ATTEMPTS';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RolesRepository,
    private readonly redisService: RedisService,
    private readonly userAuthValidator: UserAuthValidator,
    private readonly dynamicConfigRepository: DynamicConfigRepository
  ) {}

  async findOrCreateActiveUserByMobile(dto: SendOtpDto, createUser: boolean = true) {
    let user = await this.userRepository.findByMobile(dto.mobile);

    if (!user) {
      if (createUser) {
        const role = await this.roleRepository.findByName(dto.role);

        if (!role) {
          throw new BusinessException(ERROR_CODES.AUTH.INVALID_ROLE);
        }

        user = await this.userRepository.save({
          mobile: dto.mobile,
          status: UserStatus.IN_APPROVAL,
          applicationId: CommonUtils.generateApplicationId(),
          ...(dto.partnerType && {
            partnerType: dto.partnerType,
          }),
          role: { id: role.id },
        });

        return user;
      } else {
        throw new BusinessException(ERROR_CODES.AUTH.INVALID_MOBILE);
      }
    }

    await this.userAuthValidator.validateActiveUserByMobile(dto.mobile);

    return user;
  }

  async getOtpConfig(
    userRole?: UserRole | string,
    otpType: OtpAttemptType = OtpAttemptType.LOGIN
  ): Promise<OtpConfigResult> {
    let config: UserRoleConfig | null = null;

    if (userRole) {
      config = await this.dynamicConfigRepository.getUserConfigByUserRole(userRole as UserRole);
    }

    if (otpType === 'login') {
      return {
        maxAttempts: config?.loginMaxOtpAttempts ?? 3,
        timeoutSeconds: config?.loginOtpTimeoutSeconds ?? 3600,
        expirySeconds: config?.loginOtpExpirySeconds ?? 300,
      };
    } else {
      return {
        maxAttempts: config?.redemptionMaxOtpAttempts ?? 3,
        timeoutSeconds: config?.redemptionOtpTimeoutSeconds ?? 3600,
        expirySeconds: config?.redemptionOtpExpirySeconds ?? 300,
      };
    }
  }

  /**
   * Universal OTP attempts validator
   * Validates & tracks OTP attempts for a user based on their role configuration in `UserRoleConfig`.
   * Only allows up to maxAttempts within the timeout period.
   * Increments attempt count if `increment` argument is true and count is not > maxAttempts.
   */
  async validateOtpAttempts(options: ValidateOtpAttemptsOptions) {
    const { mobile, otpType, increment = false } = options;
    let { userRole } = options;

    if (!userRole) {
      if (options.userId) {
        const user = await this.userRepository.findById(options.userId, ['role']);

        userRole = user?.role?.name;
      } else if (mobile) {
        const user = await this.userRepository.findByMobile(String(mobile));

        userRole = user?.role?.name;
      }
    }

    const config = await this.getOtpConfig(userRole, otpType);

    const redisKey = `${this.baseOTPAttemptsRedisKey}:${otpType}:${mobile}`;

    const currentVal = await this.redisService.get(redisKey);
    let currentCount =
      typeof currentVal === 'number'
        ? currentVal
        : currentVal
          ? parseInt(String(currentVal), 10)
          : 0;

    if (currentCount >= config.maxAttempts) {
      throw new BusinessException(ERROR_CODES.AUTH.TOO_MANY_REQUESTS);
    }

    if (increment) {
      currentCount += 1;

      await this.redisService.set(redisKey, currentCount, config.timeoutSeconds);

      if (currentCount > config.maxAttempts) {
        throw new BusinessException(ERROR_CODES.AUTH.TOO_MANY_REQUESTS);
      }
    }

    return {
      allowed: true,
      currentCount,
      maxAttempts: config.maxAttempts,
      timeoutSeconds: config.timeoutSeconds,
      expirySeconds: config.expirySeconds,
    };
  }

  async clearOtpAttempts(mobile: string | number, otpType: OtpAttemptType = OtpAttemptType.LOGIN) {
    const redisKey = `OTP_ATTEMPTS:${otpType}:${mobile}`;

    await this.redisService.delete(redisKey);
  }

  async validateSendOtpAttempts(
    mobile: number | string,
    increment: boolean = false,
    userRole?: UserRole | string
  ) {
    return this.validateOtpAttempts({
      mobile,
      otpType: OtpAttemptType.LOGIN,
      userRole,
      increment,
    });
  }
}
