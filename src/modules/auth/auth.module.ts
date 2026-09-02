import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { AuthTokenService } from './auth-token.service';
import { UserAuthValidator } from './validators/user-auth.validator';
import { UserValidator } from 'src/default/common/validators';
import { ConfigModule } from 'src/default/config/config.module';
import { AppConfigService } from 'src/default/config/config.service';
import { JwtStrategy } from 'src/default/common/stratagy/jwt.strategy';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';

import {
  LoginHistoriesRepository,
  RevokedTokenRepository,
  OTPAttemptLogsRepository,
  UserMappingRepository,
} from './repository';
import { UserRepository, RolesRepository } from './repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.getJwtAccessSecret(),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    RedisModule,
  ],
  providers: [
    AuthService,
    AuthTokenService,
    UserAuthValidator,
    UserValidator,
    JwtStrategy,
    IdempotencyService,
    AppConfigService,
    UserRepository,
    RolesRepository,
    RevokedTokenRepository,
    LoginHistoriesRepository,
    OTPAttemptLogsRepository,
    UserMappingRepository,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    UserAuthValidator,
    UserValidator,
    UserRepository,
    RolesRepository,
    RevokedTokenRepository,
    LoginHistoriesRepository,
    OTPAttemptLogsRepository,
    UserMappingRepository,
  ],
})
export class AuthModule {}
