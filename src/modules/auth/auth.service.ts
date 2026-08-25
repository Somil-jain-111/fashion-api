import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import {
  LoginHistoriesRepository,
  OTPAttemptLogsRepository,
  RolesRepository,
} from 'src/modules/auth/repository';
import { UserRepository } from 'src/modules/auth/repository';
import { User } from 'src/modules/auth/entities';
import { OtpHelper } from 'src/default/common/helper/otp.helper';
import { DateHelper } from 'src/default/common/helper/date.helper';
import { IdentifierHelper } from 'src/default/common/helper/identifier.helper';
import { UserAuthValidator } from './validators/user-auth.validator';
import { CommonUtils } from 'src/default/common/utils/common.utils';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { PasswordHelper } from 'src/default/common/helper/password.helper';
import { AuthTokenHelper } from 'src/default/common/helper/auth-token.helper';
import { MAX_OTP_VERIFY_ATTEMPTS, OTP_EXPIRY_MINUTES, UserStatus } from './constants/auth.constants';
import { RevokedTokenRepository } from 'src/modules/auth/repository';
import { TokenType } from 'src/default/common/enums/token-type.enum';
import { TokenHashHelper } from 'src/default/common/helper/token-hash.helper';
import { UserValidator } from 'src/default/common/validators';
import { AppConfigService } from 'src/default/config/config.service';
import { OtpAttemptType } from 'src/default/common/enums/common.enum';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private rolesRepository: RolesRepository,
    private revokedTokenRepository: RevokedTokenRepository,
    private loginHistoryRepository: LoginHistoriesRepository,
    private otpAttemptLogsRepository: OTPAttemptLogsRepository,

    private readonly jwtService: JwtService,
    private readonly userAuthValidator: UserAuthValidator,
    private readonly userValidator: UserValidator,
    private readonly appConfigService: AppConfigService
  ) {}

  /**
   * Single entry point for both "brand new identifier" and "existing account that never
   * finished registration" — both look identical to the caller: verify an OTP, then set a
   * password. An identifier with a password already set is told to use /auth/login instead
   * rather than being silently re-OTP'd.
   */
  async sendOtp(dto: SendOtpDto) {
    const identifier = IdentifierHelper.resolve(dto);
    let user = await this.findByIdentifier(identifier);

    if (!user) {
      user = await this.createUserForIdentifier(identifier);
    } else if (user.password) {
      throw new BusinessException(ERROR_CODES.AUTH.PASSWORD_ALREADY_SET);
    }

    await this.issueAndDispatchOtp(user, identifier, OtpAttemptType.LOGIN);

    return {
      channel: identifier.type,
      maskedIdentifier:
        identifier.type === 'mobile' ? OtpHelper.maskMobile(identifier.value) : OtpHelper.maskEmail(identifier.value),
      otpExpiryInMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  /**
   * Verifies the OTP and, based on what it was issued for (see otpPurpose), returns a
   * short-lived action ticket rather than logging the user in directly — the OTP itself
   * must not be replayable against the sensitive action it unlocks.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const identifier = IdentifierHelper.resolve(dto);
    const user = await this.findByIdentifier(identifier);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    if (Number(user.otp_attempt_count) >= MAX_OTP_VERIFY_ATTEMPTS) {
      throw new BusinessException(ERROR_CODES.AUTH.TOO_MANY_REQUESTS);
    }

    if (OtpHelper.isOtpExpired(user.otp_expiry)) {
      throw new BusinessException(ERROR_CODES.AUTH.OTP_EXPIRED);
    }

    const isOtpValid = user.otp ? await PasswordHelper.comparePassword(dto.otp, user.otp) : false;

    if (!isOtpValid) {
      await this.userRepository.updateById(user.id, {
        otp_attempt_count: Number(user.otp_attempt_count) + 1,
      });

      throw new BusinessException(ERROR_CODES.AUTH.INVALID_OTP);
    }

    const purpose = user.otpPurpose;

    await this.userRepository.updateById(user.id, {
      otp: null,
      otp_expiry: null,
      otp_attempt_count: 0,
      otpPurpose: null,
    });

    if (purpose === OtpAttemptType.PASSWORD_RESET) {
      const resetPasswordTicket = await AuthTokenHelper.generateActionTicket(
        this.jwtService,
        user.id,
        'RESET_PASSWORD'
      );
      return { step: 'reset_password' as const, resetPasswordTicket };
    }

    const setPasswordTicket = await AuthTokenHelper.generateActionTicket(
      this.jwtService,
      user.id,
      'SET_PASSWORD'
    );
    return { step: 'set_password' as const, setPasswordTicket };
  }

  /**
   * Completes first-time registration: consumes the set-password ticket from verifyOtp,
   * saves the password, and auto-logs the user in (matches today's "OTP success logs you
   * in" behavior — it's just gated behind an explicit password step now).
   */
  async setPassword(dto: SetPasswordDto, req: any) {
    const userId = await AuthTokenHelper.verifyActionTicket(
      this.jwtService,
      dto.setPasswordTicket,
      'SET_PASSWORD'
    );

    if (dto.password !== dto.confirmPassword) {
      throw new BusinessException(ERROR_CODES.AUTH.PASSWORD_MISMATCH);
    }

    const user = await this.userRepository.findById(userId, ['roles']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    if (user.password) {
      throw new BusinessException(ERROR_CODES.AUTH.PASSWORD_ALREADY_SET);
    }

    user.password = await PasswordHelper.hashPassword(dto.password);
    if (user.status !== UserStatus.ACTIVE) {
      user.status = UserStatus.ACTIVE;
    }

    const tokens = await AuthTokenHelper.generateTokens(this.jwtService, user);

    user.refreshToken = tokens.refreshToken;
    user.refreshTokenExpiry = DateHelper.getRefreshTokenExpiryDate();

    await this.userRepository.save(user);

    await this.createLoginHistory(user, req, 1);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto, req: any) {
    const identifier = IdentifierHelper.resolve(dto);
    const user = await this.findByIdentifier(identifier);

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
    const identifier = IdentifierHelper.resolve(dto);
    const user = await this.findByIdentifier(identifier);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    this.userAuthValidator.validateUserStatus(user.status);

    if (!user.password) {
      throw new BusinessException(ERROR_CODES.AUTH.NO_PASSWORD_SET);
    }

    await this.issueAndDispatchOtp(user, identifier, OtpAttemptType.PASSWORD_RESET);

    return {
      channel: identifier.type,
      maskedIdentifier:
        identifier.type === 'mobile' ? OtpHelper.maskMobile(identifier.value) : OtpHelper.maskEmail(identifier.value),
      otpExpiryInMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  /**
   * Deliberately does not auto-login (unlike setPassword) — a security-sensitive reset
   * should require an explicit fresh login with the new password, not silently hand back
   * a live session.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const userId = await AuthTokenHelper.verifyActionTicket(
      this.jwtService,
      dto.resetPasswordTicket,
      'RESET_PASSWORD'
    );

    if (dto.password !== dto.confirmPassword) {
      throw new BusinessException(ERROR_CODES.AUTH.PASSWORD_MISMATCH);
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    user.password = await PasswordHelper.hashPassword(dto.password);

    /**
     * Invalidate any pending OTP state and log out every existing session.
     */
    user.otp = null;
    user.otp_expiry = null;
    user.otp_attempt_count = 0;
    user.otpPurpose = null;
    user.refreshToken = null;
    user.refreshTokenExpiry = null;

    await this.userRepository.save(user);

    return {
      message: 'Password reset successfully. Please login with your new password.',
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

  async profile(userId: number) {
    const user = await this.userRepository.findOne(
      {
        id: userId,
      },
      ['roles', 'storeInformation']
    );

    return user;
  }

  private async findByIdentifier(identifier: { type: 'mobile' | 'email'; value: string }) {
    return identifier.type === 'mobile'
      ? this.userRepository.findByMobile(identifier.value)
      : this.userRepository.findByEmail(identifier.value);
  }

  private async createUserForIdentifier(identifier: { type: 'mobile' | 'email'; value: string }) {
    const customerRole = await this.rolesRepository.findByName(UserRole.CUSTOMER);

    if (!customerRole) {
      throw new BusinessException(ERROR_CODES.ROLE.ROLE_NOT_FOUND);
    }

    return this.userRepository.save({
      uuid: randomUUID(),
      mobile: identifier.type === 'mobile' ? identifier.value : null,
      email: identifier.type === 'email' ? identifier.value : null,
      roles: [customerRole],
      status: UserStatus.ACTIVE,
    });
  }

  private async issueAndDispatchOtp(
    user: User,
    identifier: { type: 'mobile' | 'email'; value: string },
    purpose: OtpAttemptType
  ) {
    let otpPlain = OtpHelper.generateOtp();

    const isProd = this.appConfigService.isProduction() || this.appConfigService.isQa();
    if (!isProd) {
      otpPlain = this.appConfigService.getNonProdOtp().toString();
    }

    const otpHash = await PasswordHelper.hashPassword(otpPlain);
    const otpExpiry = OtpHelper.generateExpiryDate(OTP_EXPIRY_MINUTES * 60);

    await this.userRepository.updateById(user.id, {
      otp: otpHash,
      otp_expiry: otpExpiry,
      otp_attempt_count: 0,
      otpPurpose: purpose,
    });

    const dispatchResult =
      identifier.type === 'mobile'
        ? await CommonUtils.sendWhatsappOtp({ mobile: identifier.value, otp: otpPlain })
        : await CommonUtils.sendEmailOtp({ email: identifier.value, otp: otpPlain });

    if (!dispatchResult) {
      throw new BusinessException(ERROR_CODES.AUTH.OTP_SEND_FAILED);
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
