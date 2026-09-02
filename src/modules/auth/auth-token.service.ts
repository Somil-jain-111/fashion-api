import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities';
import { AuthTokenHelper } from 'src/default/common/helper/auth-token.helper';
import { AppConfigService } from 'src/default/config/config.service';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService
  ) {}

  async generateTokens(user: User) {
    return AuthTokenHelper.generateTokens(this.jwtService, user, this.config.getJwtRefreshSecret());
  }
}
