import { Module } from '@nestjs/common';
import { SellerKycService } from './seller-kyc.service';
import { SellerKycController } from './seller-kyc.controller';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  ApiResponseRepository,
  SellerKycOverrideRepository,
} from './repository';
import { PanProvider, GstProvider, AadhaarProvider, NameMatchProvider } from './provider';
import { ConfigModule } from 'src/default/config/config.module';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, RedisModule, AuthModule],
  providers: [
    SellerKycService,
    KycVerificationRepository,
    KycVerificationLogRepository,
    ApiResponseRepository,
    SellerKycOverrideRepository,
    PanProvider,
    GstProvider,
    AadhaarProvider,
    NameMatchProvider,
    IdempotencyService,
  ],
  controllers: [SellerKycController],
  exports: [
    SellerKycService,
    KycVerificationRepository,
    KycVerificationLogRepository,
    SellerKycOverrideRepository,
  ],
})
export class SellerKycModule {}
