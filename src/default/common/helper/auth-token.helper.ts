import { JwtService } from '@nestjs/jwt';
import {
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY,
} from 'src/modules/auth/constants/auth.constants';
import { User } from 'src/modules/auth/entities';

export class AuthTokenHelper {
  static async generateTokens(jwtService: JwtService, user: User) {
    const payload = {
      sub: user.id,
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      email: user.email,
      role: user.role?.name,
      user_type: user.role?.user_type,
    };

    const accessToken = await jwtService.signAsync(payload, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = await jwtService.signAsync(payload, {
      expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
  static getTokenExpiryDate(token: string): Date {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    return new Date(decoded.exp * 1000);
  }
}
