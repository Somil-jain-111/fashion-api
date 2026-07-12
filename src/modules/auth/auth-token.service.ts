import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_ACCESS_TOKEN_EXPIRY, JWT_REFRESH_TOKEN_EXPIRY } from './constants/auth.constants';
import { User } from './entities';

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      email: user.email,
      role: user.role?.name,
      user_type: user.role?.user_type,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
