import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { RevokedTokenRepository, UserRepository } from 'src/modules/auth/repository';
import { MaintenanceService } from './maintenance.service';
import { TokenHashHelper } from 'src/default/common/helper/token-hash.helper';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { AuthTokenHelper } from 'src/default/common/helper/auth-token.helper';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly userAuthValidator: UserAuthValidator
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path as string;

    if (
      path === '/' ||
      path.endsWith('/metrics') ||
      path.endsWith('/auth/admin-login') ||
      path.endsWith('/webhooks/boost-payments')
    )
      return true;

    const state = await this.maintenanceService.getState();
    if (!state.enabled) return true;

    const token = request.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: number; tokenType: string }>(
          token,
          {
            issuer: AuthTokenHelper.issuer,
            audience: AuthTokenHelper.accessAudience,
            algorithms: ['HS256'],
          }
        );
        if (payload.tokenType !== 'access') throw new Error('Wrong token type');
        const isRevoked = await this.revokedTokenRepository.isTokenRevoked(
          TokenHashHelper.hashToken(token)
        );
        if (isRevoked) throw new Error('Token revoked');

        const user = payload.sub
          ? await this.userRepository.findAuthContextById(payload.sub)
          : null;
        if (user) this.userAuthValidator.validateUserStatus(user.status);

        if (user?.roles?.some((role) => role.name === UserRole.SUPERADMIN)) {
          return true;
        }
      } catch {
        // Invalid/expired tokens are treated like anonymous callers during maintenance.
      }
    }

    throw new BusinessException(ERROR_CODES.APP_VERSION.MAINTENANCE_MODE, {
      reason: state.message,
    });
  }
}
