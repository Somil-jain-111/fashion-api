import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRepository } from 'src/modules/user/repository';
import { RevokedTokenRepository } from 'src/modules/auth/repository';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { BearerTokenHelper } from '../helper/bearer-token.helper';
import { TokenHashHelper } from '../helper/token-hash.helper';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly revokedTokenRepository: RevokedTokenRepository,
    private readonly userAuthValidator: UserAuthValidator
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.API_SECRET || 'secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const accessToken = BearerTokenHelper.extractTokenFromHeader(req);

    if (!accessToken) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    const tokenHash = TokenHashHelper.hashToken(accessToken);

    const isRevoked = await this.revokedTokenRepository.isTokenRevoked(tokenHash);

    if (isRevoked) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    const user = await this.userRepository.findByIdWithRole(payload.sub);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    await this.userAuthValidator.validateUserStatus(user.status);

    return {
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      email: user.email,
      role: user.role.name,
      status: user.status,
    };
  }
}
