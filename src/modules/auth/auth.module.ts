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
  KycVerificationRepository,
  LoginHistoriesRepository,
  RevokedTokenRepository,
  OTPAttemptLogsRepository,
} from './repository';
import { UserRepository, RolesRepository, UserStoreInfoRepository } from '../auth/repository';
import { AddressesModule } from '../addresses/addresses.module';
import { ApprovalRepository } from '../approvals/repository';
import { DynamicConfigModule } from '../dynamic-config/dynamic-config.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: async (configService: AppConfigService) => ({
        secret: configService.get('API_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    RedisModule,
    AddressesModule,
    DynamicConfigModule,
    SmsModule,
  ],
  providers: [
    AuthService,
    AuthTokenService,
    UserAuthValidator,
    UserValidator,
    JwtStrategy,
    IdempotencyService,
    AppConfigService,
    ApprovalRepository,
    UserRepository,
    RolesRepository,
    UserStoreInfoRepository,
    RevokedTokenRepository,
    LoginHistoriesRepository,
    KycVerificationRepository,
    OTPAttemptLogsRepository,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    UserAuthValidator,
    UserValidator,
    UserRepository,
    ApprovalRepository,
    RolesRepository,
    UserStoreInfoRepository,
    RevokedTokenRepository,
    LoginHistoriesRepository,
    KycVerificationRepository,
    OTPAttemptLogsRepository,
  ],
})
export class AuthModule {}
