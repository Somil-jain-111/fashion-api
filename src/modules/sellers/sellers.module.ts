import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import {
  SellerReviewRepository,
  SellerUpdateRequestRepository,
  StoreInformationRepository,
} from './repository';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from 'src/default/config/config.module';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { SellerKycService } from '../seller-kyc/seller-kyc.service';
import { SellerKycController } from '../seller-kyc/seller-kyc.controller';
import {
  ApiResponseRepository,
  KycVerificationLogRepository,
  KycVerificationRepository,
  SellerKycOverrideRepository,
} from '../seller-kyc/repository';
import {
  AadhaarProvider,
  GstProvider,
  NameMatchProvider,
  PanProvider,
} from '../seller-kyc/provider';

@Module({
  imports: [AuthModule, ConfigModule, RedisModule],
  providers: [
    SellersService,
    StoreInformationRepository,
    SellerReviewRepository,
    SellerUpdateRequestRepository,
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
  controllers: [SellersController, SellerKycController],
  exports: [
    SellersService,
    StoreInformationRepository,
    SellerReviewRepository,
    SellerKycService,
    KycVerificationRepository,
    KycVerificationLogRepository,
    SellerKycOverrideRepository,
  ],
})
export class SellersModule {}
