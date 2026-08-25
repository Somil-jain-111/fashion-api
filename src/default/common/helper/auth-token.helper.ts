import { JwtService } from '@nestjs/jwt';
import {
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY,
  RESET_TOKEN_EXPIRY_MINUTES,
} from 'src/modules/auth/constants/auth.constants';
import { User } from 'src/modules/auth/entities';
import { UserRole } from '../enums/user-type.enum';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';

export type ActionTicketPurpose = 'SET_PASSWORD' | 'RESET_PASSWORD';

interface ActionTicketPayload {
  sub: number;
  purpose: ActionTicketPurpose;
  type: 'action_ticket';
}

export class AuthTokenHelper {
  static async generateTokens(jwtService: JwtService, user: User) {
    const payload = {
      sub: user.id,
      id: user.id,
      uuid: user.uuid,
      mobile: user.mobile,
      email: user.email,
      role: user.roles?.map((r) => r.name),
      user_type: user.roles?.map((r) => r.user_type),
    };

    const isSuperAdmin = user.roles.some((r) => r.name === UserRole.SUPERADMIN);

    const accessToken = await jwtService.signAsync(
      payload,
      isSuperAdmin
        ? {}
        : {
            expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
          }
    );

    const refreshToken = await jwtService.signAsync(
      payload,
      isSuperAdmin
        ? {}
        : {
            expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
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
    const payload: ActionTicketPayload = { sub: userId, purpose, type: 'action_ticket' };

    return jwtService.signAsync(payload, {
      expiresIn: `${RESET_TOKEN_EXPIRY_MINUTES}m`,
    });
  }

  static async verifyActionTicket(
    jwtService: JwtService,
    ticket: string,
    expectedPurpose: ActionTicketPurpose
  ): Promise<number> {
    let payload: ActionTicketPayload;

    try {
      payload = await jwtService.verifyAsync<ActionTicketPayload>(ticket);
    } catch {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    if (payload.type !== 'action_ticket' || payload.purpose !== expectedPurpose) {
      throw new BusinessException(ERROR_CODES.AUTH.INVALID_ACCESS_TOKEN);
    }

    return payload.sub;
  }
}
