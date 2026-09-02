import { JwtService } from '@nestjs/jwt';
import { MaintenanceGuard } from 'src/modules/maintenance/maintenance.guard';
import { MaintenanceService } from 'src/modules/maintenance/maintenance.service';
import { RevokedTokenRepository, UserRepository } from 'src/modules/auth/repository';
import { createMock } from '../utils/mock.util';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';

const contextFor = (path: string, authorization?: string) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ path, headers: { authorization } }),
    }),
  }) as any;

describe('MaintenanceGuard', () => {
  let guard: MaintenanceGuard;
  let maintenanceService: jest.Mocked<MaintenanceService>;
  let jwtService: jest.Mocked<JwtService>;
  let userRepository: jest.Mocked<UserRepository>;
  let revokedTokens: jest.Mocked<RevokedTokenRepository>;
  let userAuthValidator: jest.Mocked<UserAuthValidator>;

  beforeEach(() => {
    maintenanceService = createMock<MaintenanceService>();
    jwtService = createMock<JwtService>();
    userRepository = createMock<UserRepository>();
    revokedTokens = createMock<RevokedTokenRepository>();
    userAuthValidator = createMock<UserAuthValidator>();
    guard = new MaintenanceGuard(
      maintenanceService,
      jwtService,
      userRepository,
      revokedTokens,
      userAuthValidator
    );
  });

  it('allows all callers when maintenance is disabled', async () => {
    maintenanceService.getState.mockResolvedValue({ enabled: false, message: 'maintenance' });
    await expect(guard.canActivate(contextFor('/api/v1/catalog'))).resolves.toBe(true);
  });

  it('returns 503 for anonymous and non-super-admin callers during maintenance', async () => {
    maintenanceService.getState.mockResolvedValue({ enabled: true, message: 'Back soon' });

    await expect(guard.canActivate(contextFor('/api/v1/catalog'))).rejects.toMatchObject({
      status: 503,
      response: { errorCode: 'APP_VERSION_003', message: 'Back soon' },
    });
  });

  it('allows a verified super-admin token during maintenance', async () => {
    maintenanceService.getState.mockResolvedValue({ enabled: true, message: 'Back soon' });
    jwtService.verifyAsync.mockResolvedValue({ sub: 7, tokenType: 'access' } as any);
    revokedTokens.isTokenRevoked.mockResolvedValue(false);
    userRepository.findAuthContextById.mockResolvedValue({
      id: 7,
      status: UserStatus.ACTIVE,
      roles: [{ name: 'super_admin' }],
    } as any);

    await expect(
      guard.canActivate(contextFor('/api/v1/super-admin/maintenance', 'Bearer valid-token'))
    ).resolves.toBe(true);
  });

  it('keeps admin login and health metrics available', async () => {
    await expect(guard.canActivate(contextFor('/api/v1/auth/admin-login'))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor('/api/v1/metrics'))).resolves.toBe(true);
    expect(maintenanceService.getState).not.toHaveBeenCalled();
  });
});
