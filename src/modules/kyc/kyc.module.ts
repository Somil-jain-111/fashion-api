import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { KycService } from './kyc.service';

import { PanProvider } from './provider/pan.provider';
import { AadhaarProvider } from './provider/aadhaar.provider';
import { GstProvider } from './provider/gst.provider';
import { BankProvider } from './provider/bank.provider';
import { UpiProvider } from './provider/upi.provider';

import { ConfigModule } from 'src/default/config/config.module';
import { AuthModule } from '../auth/auth.module';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { KycVerificationLogEntity } from './entities/kyc-verification-logs.entity';
import { ApiResponseEntity } from './entities/api-response.entity';
import { UserBeneficiary } from './entities/beneficiary.entity';
import { KYCController } from './kyc.controller';
import {
  KycVerificationLogRepository,
  KycVerificationRepository,
  ApiResponseRepository,
  BeneficiaryRepository,
} from 'src/modules/kyc/repository';
import { NameMatchProvider } from './provider/name-matching.provider';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KycVerificationEntity,
      KycVerificationLogEntity,
      ApiResponseEntity,
      UserBeneficiary,
    ]),

    ConfigModule,

    /**
     * Required because KycService uses UserAuthValidator.
     * AuthModule must export UserAuthValidator.
     */
    AuthModule,
    RedisModule,
    SmsModule,
  ],

  controllers: [KYCController],

  providers: [
    KycService,

    KycVerificationRepository,
    KycVerificationLogRepository,
    ApiResponseRepository,
    BeneficiaryRepository,

    NameMatchProvider,
    PanProvider,
    AadhaarProvider,
    GstProvider,
    BankProvider,
    UpiProvider,
    IdempotencyService,
  ],

  exports: [
    KycService,
    KycVerificationRepository,
    KycVerificationLogRepository,
    ApiResponseRepository,
    BeneficiaryRepository,
    BankProvider,
    UpiProvider,
    PanProvider,
    AadhaarProvider,
    GstProvider,
  ],
})
export class KycModule {}
