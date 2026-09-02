import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRepository } from 'src/modules/auth/repository';
import { RevokedTokenRepository } from 'src/modules/auth/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { BearerTokenHelper } from '../helper/bearer-token.helper';
import { TokenHashHelper } from '../helper/token-hash.helper';
import { AppConfigService } from 'src/default/config/config.service';
import { AuthTokenHelper } from '../helper/auth-token.helper';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly userAuthValidator: UserAuthValidator,
    configService: AppConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getJwtAccessSecret(),
      algorithms: ['HS256'],
      issuer: AuthTokenHelper.issuer,
      audience: AuthTokenHelper.accessAudience,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    if (payload?.tokenType !== 'access') {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }
    const accessToken = BearerTokenHelper.extractTokenFromHeader(req);

    if (!accessToken) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    const tokenHash = TokenHashHelper.hashToken(accessToken);

    const isRevoked = await this.revokedTokenRepository.isTokenRevoked(tokenHash);

    if (isRevoked) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    const user = await this.userRepository.findAuthContextById(payload.sub);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    // await this.userAuthValidator.validateUserBlockedStatus(user);
    this.userAuthValidator.validateUserStatus(user.status);

    return {
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      email: user.email,
      role: user.roles.map((r) => r.name),
      status: user.status,
    };
  }
}
