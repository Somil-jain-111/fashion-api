import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/modules/auth/auth.service';
import {
  UserRepository,
  RolesRepository,
  RevokedTokenRepository,
  LoginHistoriesRepository,
  OTPAttemptLogsRepository,
} from 'src/modules/auth/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { UserValidator } from 'src/default/common/validators';
import { AppConfigService } from 'src/default/config/config.service';
import { PasswordHelper } from 'src/default/common/helper/password.helper';
import { UserStatus, MAX_OTP_VERIFY_ATTEMPTS } from 'src/modules/auth/constants/auth.constants';
import { OtpAttemptType } from 'src/default/common/enums/common.enum';
import { createMock } from '../utils/mock.util';
import { RedisService } from 'src/default/databases/redis/redis.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let userAuthValidator: jest.Mocked<UserAuthValidator>;
  let appConfigService: jest.Mocked<AppConfigService>;
  let redisService: jest.Mocked<RedisService>;

  const baseUser = (overrides: Record<string, any> = {}) => ({
    id: 1,
    uuid: 'uuid-1',
    mobile: '9876543210',
    email: null,
    status: UserStatus.ACTIVE,
    password: null,
    otp: null,
    otp_expiry: null,
    otp_attempt_count: 0,
    otpPurpose: null,
    roles: [{ name: 'customer', user_type: 'USER' }],
    ...overrides,
  });

  describe('getLoginOptions', () => {
    it('offers OTP only for a first-time identifier', async () => {
      userRepository.findLoginCapabilities.mockResolvedValue(null);

      await expect(service.getLoginOptions({ email: 'new@test.com' })).resolves.toEqual({
        passwordAvailable: false,
        otpAvailable: true,
        passwordSetupRequired: true,
        nextStep: 'request_otp',
      });
    });

    it('offers both password and OTP for an existing password account', async () => {
      userRepository.findLoginCapabilities.mockResolvedValue({ passwordAvailable: true });

      await expect(service.getLoginOptions({ mobile: '9876543210' })).resolves.toEqual({
        passwordAvailable: true,
        otpAvailable: true,
        passwordSetupRequired: false,
        nextStep: 'choose_login_method',
      });
    });
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: createMock<UserRepository>() },
        { provide: RolesRepository, useValue: createMock<RolesRepository>() },
        { provide: RevokedTokenRepository, useValue: createMock<RevokedTokenRepository>() },
        { provide: LoginHistoriesRepository, useValue: createMock<LoginHistoriesRepository>() },
        { provide: OTPAttemptLogsRepository, useValue: createMock<OTPAttemptLogsRepository>() },
        // AuthTokenHelper/AuthTokenHelper.generateActionTicket call jwtService.signAsync
        // directly (not injected via DI) — a real JwtService signs/verifies real test
        // JWTs without needing to mock every call site individually.
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
        { provide: UserAuthValidator, useValue: createMock<UserAuthValidator>() },
        { provide: UserValidator, useValue: createMock<UserValidator>() },
        { provide: AppConfigService, useValue: createMock<AppConfigService>() },
        { provide: RedisService, useValue: createMock<RedisService>() },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepository = module.get(UserRepository);
    rolesRepository = module.get(RolesRepository);
    userAuthValidator = module.get(UserAuthValidator);
    appConfigService = module.get(AppConfigService);
    redisService = module.get(RedisService);

    // Local-only by default: matches how this service actually behaves in dev
    // (see issueAndDispatchOtp) — the real OTP dispatch never fires here.
    appConfigService.isLocalOnly.mockReturnValue(true);
    appConfigService.isProduction.mockReturnValue(false);
    appConfigService.isQa.mockReturnValue(false);
    appConfigService.getNonProdOtp.mockReturnValue(8899 as any);
    redisService.incrementWithExpiry.mockResolvedValue(1);
  });

  describe('sendOtp', () => {
    it('creates a new user when the identifier is not found', async () => {
      userRepository.findByMobile.mockResolvedValue(null);
      rolesRepository.findByName.mockResolvedValue({ id: 3, name: 'customer' } as any);
      userRepository.save.mockResolvedValue(baseUser({ id: 5 }) as any);
      userRepository.updateById.mockResolvedValue(true as any);

      const result = await service.sendOtp({ mobile: '9876543210' } as any);

      expect(userRepository.save).toHaveBeenCalled();
      expect(result.channel).toBe('mobile');
    });

    it('sends a login OTP when the existing user already has a password', async () => {
      userRepository.findByMobile.mockResolvedValue(baseUser({ password: 'hashed' }) as any);
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);
      userRepository.updateById.mockResolvedValue(true as any);

      await expect(service.sendOtp({ mobile: '9876543210' } as any)).resolves.toMatchObject({
        channel: 'mobile',
      });
      expect(userRepository.updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ otpPurpose: OtpAttemptType.LOGIN })
      );
    });
  });

  describe('login', () => {
    it('rejects with INVALID_CREDENTIALS on a wrong password', async () => {
      const hashed = await PasswordHelper.hashPassword('correct-password');
      userRepository.findByMobile.mockResolvedValue(baseUser({ password: hashed }) as any);
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);
      userRepository.updateById.mockResolvedValue(true as any);

      await expect(
        service.login({ mobile: '9876543210', password: 'wrong-password' } as any, {})
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_001' } });
    });

    it('rejects with PASSWORD_LOGIN_DISABLED when no password is set', async () => {
      userRepository.findByMobile.mockResolvedValue(baseUser({ password: null }) as any);
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);

      await expect(
        service.login({ mobile: '9876543210', password: 'anything' } as any, {})
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_007' } });
    });

    it('returns tokens on a correct password', async () => {
      const hashed = await PasswordHelper.hashPassword('correct-password');
      userRepository.findByMobile.mockResolvedValue(baseUser({ password: hashed }) as any);
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);
      userRepository.updateRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.login(
        { mobile: '9876543210', password: 'correct-password' } as any,
        {}
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });
  });

  describe('adminLogin', () => {
    it('rejects a non-admin account with a correct password using the same generic error as a bad password', async () => {
      const hashed = await PasswordHelper.hashPassword('correct-password');
      userRepository.findByEmail.mockResolvedValue(
        baseUser({
          email: 'customer@test.com',
          password: hashed,
          roles: [{ name: 'customer' }],
        }) as any
      );

      await expect(
        service.adminLogin({ email: 'customer@test.com', password: 'correct-password' } as any, {})
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_001' } });
    });

    it('succeeds for a super_admin with a correct password', async () => {
      const hashed = await PasswordHelper.hashPassword('correct-password');
      userRepository.findByEmail.mockResolvedValue(
        baseUser({
          email: 'super@test.com',
          password: hashed,
          roles: [{ name: 'super_admin', user_type: 'ADMIN' }],
        }) as any
      );
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);
      userRepository.updateRefreshToken.mockResolvedValue(undefined as any);

      const result = await service.adminLogin(
        { email: 'super@test.com', password: 'correct-password' } as any,
        {}
      );

      expect(result.accessToken).toEqual(expect.any(String));
    });
  });

  describe('sellerLogin', () => {
    it('rejects a customer-only account even when its password is correct', async () => {
      const hashed = await PasswordHelper.hashPassword('correct-password');
      userRepository.findByEmail.mockResolvedValue(
        baseUser({
          email: 'customer@test.com',
          password: hashed,
          roles: [{ name: 'customer' }],
        }) as any
      );

      await expect(
        service.sellerLogin({ email: 'customer@test.com', password: 'correct-password' } as any, {})
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_001' } });
    });

    it('authenticates an onboarded seller without removing the customer role', async () => {
      const hashed = await PasswordHelper.hashPassword('correct-password');
      userRepository.findByEmail.mockResolvedValue(
        baseUser({
          email: 'seller@test.com',
          password: hashed,
          roles: [
            { name: 'customer', user_type: 'USER' },
            { name: 'seller_admin', user_type: 'USER' },
          ],
        }) as any
      );
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);
      userRepository.updateRefreshToken.mockResolvedValue(true as any);

      const result = await service.sellerLogin(
        { email: 'seller@test.com', password: 'correct-password' } as any,
        {}
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });
  });

  describe('verifyOtp', () => {
    it('increments the attempt count and throws INVALID_OTP on a wrong OTP', async () => {
      const hashedOtp = await PasswordHelper.hashPassword('8899');
      userRepository.findByMobile.mockResolvedValue(
        baseUser({
          otp: hashedOtp,
          otp_expiry: new Date(Date.now() + 60_000),
          otp_attempt_count: 0,
        }) as any
      );
      userRepository.updateById.mockResolvedValue(true as any);

      await expect(
        service.verifyOtp({ mobile: '9876543210', otp: '0000' } as any)
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_009' } });

      expect(userRepository.updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ otp_attempt_count: 1 })
      );
    });

    it('rejects with TOO_MANY_REQUESTS once the attempt limit is reached', async () => {
      userRepository.findByMobile.mockResolvedValue(
        baseUser({ otp_attempt_count: MAX_OTP_VERIFY_ATTEMPTS }) as any
      );

      await expect(
        service.verifyOtp({ mobile: '9876543210', otp: '8899' } as any)
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_026' } });
    });

    it('rejects with OTP_EXPIRED once the OTP has expired', async () => {
      userRepository.findByMobile.mockResolvedValue(
        baseUser({ otp: 'hash', otp_expiry: new Date(Date.now() - 60_000) }) as any
      );

      await expect(
        service.verifyOtp({ mobile: '9876543210', otp: '8899' } as any)
      ).rejects.toMatchObject({ response: { errorCode: 'AUTH_010' } });
    });

    it('returns a set_password ticket for a correct OTP on a LOGIN attempt', async () => {
      const hashedOtp = await PasswordHelper.hashPassword('8899');
      userRepository.findByMobile.mockResolvedValue(
        baseUser({
          otp: hashedOtp,
          otp_expiry: new Date(Date.now() + 60_000),
          otpPurpose: OtpAttemptType.LOGIN,
        }) as any
      );
      userRepository.updateById.mockResolvedValue(true as any);

      const result = await service.verifyOtp({ mobile: '9876543210', otp: '8899' } as any);

      expect(result.step).toBe('set_password');
      expect(result.setPasswordTicket).toEqual(expect.any(String));
    });

    it('returns tokens for a correct LOGIN OTP when the account already has a password', async () => {
      const hashedOtp = await PasswordHelper.hashPassword('8899');
      userRepository.findByMobile.mockResolvedValue(
        baseUser({
          password: 'password-hash',
          otp: hashedOtp,
          otp_expiry: new Date(Date.now() + 60_000),
          otpPurpose: OtpAttemptType.LOGIN,
        }) as any
      );
      userRepository.updateById.mockResolvedValue(true as any);
      userRepository.updateRefreshToken.mockResolvedValue(true as any);
      userAuthValidator.validateUserStatus.mockReturnValue(undefined as any);

      const result = await service.verifyOtp({ mobile: '9876543210', otp: '8899' } as any, {});

      expect(result).toMatchObject({
        step: 'authenticated',
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(userRepository.updateRefreshToken).toHaveBeenCalled();
    });
  });
});
