// src/modules/kyc/kyc.module.ts

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
import { KYCController } from './kyc.controller';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
} from 'src/default/common/repositories';
import { NameMatchProvider } from './provider/name-matching.provider';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycVerificationEntity, KycVerificationLogEntity]),

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

    NameMatchProvider,
    PanProvider,
    AadhaarProvider,
    GstProvider,
    UserAuthValidator,
    IdempotencyService,
  ],

  exports: [KycService, KycVerificationRepository, KycVerificationLogRepository],
})
export class KycModule {}
