import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginHistoriesRepository } from 'src/modules/auth/repository';
import { UserRepository } from 'src/modules/user/repository';
import { OtpHelper } from 'src/default/common/helper/otp.helper';
import { DateHelper } from 'src/default/common/helper/date.helper';
import { UserAuthValidator } from './validators/user-auth.validator';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { PasswordHelper } from 'src/default/common/helper/password.helper';
import { AuthTokenHelper } from 'src/default/common/helper/auth-token.helper';
import { UserResponseMapper } from './mapper/user-response.mapper';
import { ResetTokenHelper } from 'src/default/common/helper/reset-token.helper';
import { RESET_TOKEN_EXPIRY_MINUTES } from './constants/auth.constants';
import { RevokedTokenRepository } from 'src/modules/auth/repository';
import { TokenType } from 'src/default/common/enums/token-type.enum';
import { TokenHashHelper } from 'src/default/common/helper/token-hash.helper';
import { UserValidator } from 'src/default/common/validators';
import { AppConfigService } from 'src/default/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private revokedTokenRepository: RevokedTokenRepository,
    private loginHistoryRepository: LoginHistoriesRepository,

    private readonly jwtService: JwtService,
    private readonly userAuthValidator: UserAuthValidator,
    private readonly userValidator: UserValidator,
    private readonly appConfigService: AppConfigService
    // private readonly AuthTokenHelper,
  ) {}
  // async onModuleInit() {
  //   this.userRepository = RepositoryFactory.get("user");
  //   // this.loginHistoryRepository = RepositoryFactory.get("loginhistories");
  // }

  async sendOtp(dto: SendOtpDto): Promise<{ mobile: string; otp_expiry_in_minutes: number }> {
    const user = await this.userValidator.findOrCreateActiveUserByMobile(dto, true);

    let otpPlain = await OtpHelper.generateOtp();

    if (!this.appConfigService.isProduction()) {
      otpPlain = this.appConfigService.getNonProdOtp().toString();
    }

    const otpExpiry = await DateHelper.getOtpExpiryDate();
    const otp = CommonUtils.encrypt(otpPlain);

    await this.userRepository.updateOtp(user.id, otp, otpExpiry);

    /**
     * TODO:
     * await this.smsService.sendOtp(dto.mobile, otp);
     */

    return {
      mobile: OtpHelper.maskMobile(dto.mobile),
      otp_expiry_in_minutes: 5,
    };
  }

  async verifyOtp(dto: VerifyOtpDto, req: any) {
    const user = await this.userAuthValidator.validateActiveUserByMobile(dto.mobile);

    if (!user.otp || user.otp !== CommonUtils.encrypt(dto.otp)) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_OTP);
    }

    if (OtpHelper.isOtpExpired(user.otp_expiry)) {
      throw new BusinessException(ERROR_CODES.AUTH.OTP_EXPIRED);
    }

    const tokens = await AuthTokenHelper.generateTokens(this.jwtService, user);

    user.otp = null;
    user.otp_expiry = null;
    user.otp_attempt_count = 0;
    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiry = DateHelper.getRefreshTokenExpiryDate();

    await this.userRepository.save(user);

    await this.createLoginHistory(user, req, 1);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: UserResponseMapper.toAuthUser(user),
    };
  }

  async login(dto: LoginDto, req: any) {
    this.validateLoginPayload(dto);

    const user = await this.userRepository.findByMobileOrEmail({
      email: dto.email,
    });

    if (!user) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    this.userAuthValidator.validateUserStatus(user.status);

    if (!user.password) {
      throw new BusinessException(ERROR_CODES.AUTH.PASSWORD_LOGIN_DISABLED);
    }

    const isPasswordValid = await PasswordHelper.comparePassword(dto.password, user.password);

    if (!isPasswordValid) {
      await this.createLoginHistory(user, req, 0);
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    const tokens = await AuthTokenHelper.generateTokens(this.jwtService, user);
    const refreshTokenExpiry = await DateHelper.getRefreshTokenExpiryDate();

    await this.userRepository.updateRefreshToken(user.id, tokens.refreshToken, refreshTokenExpiry);

    await this.createLoginHistory(user, req, 1);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: UserResponseMapper.toAuthUser(user),
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const user = await this.userAuthValidator.validateActiveUserByRefreshToken(dto.refreshToken);

    if (!user.refreshTokenExpiry || new Date(user.refreshTokenExpiry) < new Date()) {
      throw new BusinessException(ERROR_CODES.AUTH.REFRESH_TOKEN_EXPIRED);
    }

    const tokens = await AuthTokenHelper.generateTokens(this.jwtService, user);

    const refreshTokenExpiry = DateHelper.getRefreshTokenExpiryDate();

    await this.userRepository.updateRefreshToken(user.id, tokens.refreshToken, refreshTokenExpiry);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userAuthValidator.validateActiveUserByMobile(dto.mobile);

    const resetToken = await ResetTokenHelper.generateResetToken();
    const resetTokenExpiry = await DateHelper.getResetTokenExpiryDate();

    const isUpdated = await this.userRepository.updateResetPasswordToken(
      user.id,
      resetToken,
      resetTokenExpiry
    );

    if (!isUpdated) {
      throw new BusinessException(ERROR_CODES.AUTH.RESET_TOKEN_GENERATION_FAILED);
    }

    /**
     * TODO:
     * Send reset token/link by SMS or email.
     *
     * Example:
     * await this.smsService.sendResetPasswordToken(user.mobile, resetToken);
     */

    return {
      mobile: OtpHelper.maskMobile(user.mobile),
      reset_token_expiry_in_minutes: RESET_TOKEN_EXPIRY_MINUTES,

      /**
       * Remove this in production.
       */
      resetToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      otp: dto.token,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    user.password = hashedPassword;
    user.otp = null;

    /**
     * Logout old sessions after password reset
     */
    user.refreshToken = null;
    user.refreshTokenExpiry = null;

    await this.userRepository.save(user);

    return {
      message: 'Password reset successfully',
    };
  }

  async logout(userId: number, accessToken?: string) {
    const user = await this.userAuthValidator.validateActiveUserById(userId);

    if (!accessToken) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    if (!user.refreshToken || !user.refreshTokenExpiry) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_REFRESH_TOKEN);
    }

    await this.revokedTokenRepository.revokeManyTokens([
      {
        token_hash: TokenHashHelper.hashToken(accessToken),
        user_id: user.id,
        token_type: TokenType.ACCESS,
        expires_at: AuthTokenHelper.getTokenExpiryDate(accessToken),
      },
      {
        token_hash: TokenHashHelper.hashToken(user.refreshToken),
        user_id: user.id,
        token_type: TokenType.REFRESH,
        expires_at: user.refreshTokenExpiry,
      },
    ]);

    await this.userRepository.updateRefreshToken(user.id, null, null);

    return true;
  }
  async profile(userId: bigint) {
    const user = await this.userRepository.findOne(
      {
        id: userId,
      }['role']
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'Profile fetched successfully',
      data: UserResponseMapper.toAuthUser(user),
    };
  }

  private validateLoginPayload(dto: LoginDto): void {
    if (!dto.email) {
      throw new BusinessException(ERROR_CODES.AUTH.EMAIL_REQUIRED);
    }
  }

  private async createLoginHistory(user: any, req: any, status: number): Promise<void> {
    await this.loginHistoryRepository.createLoginHistory({
      user,
      number: user.mobile,
      latitude: req?.body?.latitude ?? null,
      longitude: req?.body?.longitude ?? null,
      ipAddress: req?.headers?.['x-forwarded-for']?.toString()?.split(',')[0] || req?.ip || null,
      status,
    });
  }
}
