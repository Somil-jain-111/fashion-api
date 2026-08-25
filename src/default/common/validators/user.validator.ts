import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { RolesRepository, UserRepository } from 'src/modules/auth/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { OtpAttemptType } from '../enums/common.enum';
import { KycStatus, KycType } from 'src/default/common/enums/kyc.enum';
import { UserPartnerType } from 'src/default/common/enums/user-type.enum';
import { User } from 'src/modules/auth/entities';

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

  ) {}


  /**
   * Universal OTP attempts validator
   * Validates & tracks OTP attempts for a user based on their role configuration in `UserRoleConfig`.
   * Only allows up to maxAttempts within the timeout period.
   * Increments attempt count if `increment` argument is true and count is not > maxAttempts.
   */
  // async validateOtpAttempts(options: ValidateOtpAttemptsOptions) {
  //   const { mobile, otpType, increment = false } = options;
  //   let { userRole } = options;

  //   let userDetails: User | null = null;

  //   if (options.userId) {
  //     userDetails = await this.userRepository.findById(options.userId, ['role']);
  //   } else if (mobile) {
  //     userDetails = await this.userRepository.findByMobile(String(mobile));
  //   }

  //   if (!userRole) {
  //     userRole = userDetails?.role?.name;
  //   }

  //   const config = await this.getOtpConfig(userRole, otpType);

  //   const redisKey = `${this.baseOTPAttemptsRedisKey}:${otpType}:${mobile}`;

  //   const currentVal = await this.redisService.get(redisKey);
  //   let currentCount =
  //     typeof currentVal === 'number'
  //       ? currentVal
  //       : currentVal
  //         ? parseInt(String(currentVal), 10)
  //         : 0;

  //   if (currentCount >= config.maxAttempts) {
  //     CommonUtils.sendMaliciousOTPEmail({
  //       user: {
  //         attempts: Number(currentCount),
  //         id: userDetails.id,
  //         mobile: userDetails.mobile,
  //         timeframeSeconds: Number(config.timeoutSeconds),
  //         username: userDetails.username,
  //       },
  //     });

  //     throw new BusinessException(ERROR_CODES.AUTH.TOO_MANY_REQUESTS);
  //   }

  //   if (increment) {
  //     currentCount += 1;

  //     await this.redisService.set(redisKey, currentCount, config.timeoutSeconds);

  //     if (currentCount > config.maxAttempts) {
  //       CommonUtils.sendMaliciousOTPEmail({
  //         user: {
  //           attempts: Number(currentCount),
  //           id: userDetails.id,
  //           mobile: userDetails.mobile,
  //           timeframeSeconds: Number(config.timeoutSeconds),
  //           username: userDetails.username,
  //         },
  //       });

  //       throw new BusinessException(ERROR_CODES.AUTH.TOO_MANY_REQUESTS);
  //     }
  //   }

  //   return {
  //     allowed: true,
  //     currentCount,
  //     maxAttempts: config.maxAttempts,
  //     timeoutSeconds: config.timeoutSeconds,
  //     expirySeconds: config.expirySeconds,
  //   };
  // }

  async clearOtpAttempts(mobile: string | number, otpType: OtpAttemptType = OtpAttemptType.LOGIN) {
    const redisKey = `OTP_ATTEMPTS:${otpType}:${mobile}`;

    await this.redisService.delete(redisKey);
  }

//   async validateSendOtpAttempts(
//     mobile: number | string,
//     increment: boolean = false,
//     userRole?: UserRole | string
//   ) {
//     return this.validateOtpAttempts({
//       mobile,
//       otpType: OtpAttemptType.LOGIN,
//       userRole,
//       increment,
//     });
//   }
}
