import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KycService } from './kyc.service';

import { PanProvider } from './provider/pan.provider';
import { AadhaarProvider } from './provider/aadhaar.provider';
import { GstProvider } from './provider/gst.provider';

import { ConfigModule } from 'src/default/config/config.module';
import { AuthModule } from '../auth/auth.module';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { KycVerificationLogEntity } from './entities/kyc-verification-logs.entity';
import { ApiResponseEntity } from './entities/api-response.entity';
import { KYCController } from './kyc.controller';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  ApiResponseRepository,
} from 'src/modules/kyc/repository';
import { NameMatchProvider } from './provider/name-matching.provider';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycVerificationEntity, KycVerificationLogEntity, ApiResponseEntity]),

    ConfigModule,

    /**
     * Required because KycService uses UserAuthValidator.
     * AuthModule must export UserAuthValidator.
     */
    AuthModule,
    RedisModule,
  ],

  controllers: [KYCController],

  providers: [
    KycService,

    KycVerificationRepository,
    KycVerificationLogRepository,
    ApiResponseRepository,

    NameMatchProvider,
    PanProvider,
    AadhaarProvider,
    GstProvider,
    IdempotencyService,
  ],

  exports: [
    KycService,
    KycVerificationRepository,
    KycVerificationLogRepository,
    ApiResponseRepository,
  ],
})
export class KycModule {}
