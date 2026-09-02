import { JwtService } from '@nestjs/jwt';
import {
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY,
  RESET_TOKEN_EXPIRY_MINUTES,
} from 'src/modules/auth/constants/auth.constants';
import { User } from 'src/modules/auth/entities';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { randomUUID } from 'crypto';

export type ActionTicketPurpose = 'SET_PASSWORD' | 'RESET_PASSWORD';

interface ActionTicketPayload {
  sub: number;
  purpose: ActionTicketPurpose;
  tokenType: 'action';
  jti: string;
}

const TOKEN_ISSUER = 'fashion-api';
const ACCESS_AUDIENCE = 'fashion-api-access';
const REFRESH_AUDIENCE = 'fashion-api-refresh';
const ACTION_AUDIENCE = 'fashion-api-action';

export class AuthTokenHelper {
  static async generateTokens(jwtService: JwtService, user: User, refreshSecret?: string) {
    const commonPayload = {
      sub: user.id,
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      email: user.email,
      role: user.roles?.map((r) => r.name),
      user_type: user.roles?.map((r) => r.user_type),
    };

    const accessToken = await jwtService.signAsync(
      { ...commonPayload, tokenType: 'access' },
      {
        expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
        issuer: TOKEN_ISSUER,
        audience: ACCESS_AUDIENCE,
        algorithm: 'HS256',
      }
    );

    const refreshToken = await jwtService.signAsync(
      { ...commonPayload, tokenType: 'refresh' },
      {
        ...(refreshSecret ? { secret: refreshSecret } : {}),
        expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
        issuer: TOKEN_ISSUER,
        audience: REFRESH_AUDIENCE,
        algorithm: 'HS256',
      }
    );

    return {
      accessToken,
      refreshToken,
    };
  }
  static getTokenExpiryDate(token: string): Date {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    return new Date(decoded.exp * 1000);
  }

  /**
   * Short-lived, single-purpose credential issued after a successful OTP verification,
   * consumed by set-password/reset-password. Keeps the OTP itself from being replayable
   * against the sensitive action it unlocks, and never carries session claims (no role,
   * no mobile/email) so it can't be mistaken for an access token even if leaked.
   */
  static async generateActionTicket(
    jwtService: JwtService,
    userId: number,
    purpose: ActionTicketPurpose
  ): Promise<string> {
    const payload: ActionTicketPayload = {
      sub: userId,
      purpose,
      tokenType: 'action',
      jti: randomUUID(),
    };

    return jwtService.signAsync(payload, {
      expiresIn: `${RESET_TOKEN_EXPIRY_MINUTES}m`,
      issuer: TOKEN_ISSUER,
      audience: ACTION_AUDIENCE,
      algorithm: 'HS256',
    });
  }

  static async verifyActionTicket(
    jwtService: JwtService,
    ticket: string,
    expectedPurpose: ActionTicketPurpose
  ): Promise<ActionTicketPayload> {
    let payload: ActionTicketPayload;

    try {
      payload = await jwtService.verifyAsync<ActionTicketPayload>(ticket, {
        issuer: TOKEN_ISSUER,
        audience: ACTION_AUDIENCE,
        algorithms: ['HS256'],
      });
    } catch {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    if (payload.tokenType !== 'action' || payload.purpose !== expectedPurpose || !payload.jti) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    return payload;
  }

  static get refreshAudience(): string {
    return REFRESH_AUDIENCE;
  }

  static get accessAudience(): string {
    return ACCESS_AUDIENCE;
  }

  static get issuer(): string {
    return TOKEN_ISSUER;
  }
}
