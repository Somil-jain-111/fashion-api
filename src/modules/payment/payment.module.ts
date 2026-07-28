import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PointPurchase, Payout } from './entities';
import { PointPurchaseRepository, PayoutRepository } from './repository';
import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { DynamicConfigModule } from '../dynamic-config/dynamic-config.module';
import { RewardsModule } from '../rewards/rewards.module';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyModule } from 'src/default/idempotency/idempotency.module';
import { PointHistoryRepository } from '../redemptions/repository';
import { AppConfigService } from 'src/default/config/config.service';
import { BeneficiaryRepository } from '../kyc/repository';
import { RazorpayIntegration } from './integrations/razorpay.integration';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payout, PointPurchase]),
    AuthModule,
    KycModule,
    DynamicConfigModule,
    RewardsModule,
    RedisModule,
    IdempotencyModule,
  ],
  controllers: [PaymentController, RazorpayWebhookController],
  providers: [
    PaymentService,
    PayoutRepository,
    PointPurchaseRepository,
    RazorpayIntegration,
    BeneficiaryRepository,
    PointHistoryRepository,
    AppConfigService,
  ],
  exports: [PaymentService, PayoutRepository, BeneficiaryRepository],
})
export class PaymentModule {}
