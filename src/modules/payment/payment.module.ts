import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payout, BankAccount } from './entities';
import { PayoutRepository, BankAccountRepository } from './repository';
import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { DynamicConfigModule } from '../dynamic-config/dynamic-config.module';
import { RewardsModule } from '../rewards/rewards.module';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyModule } from 'src/default/idempotency/idempotency.module';
import { PointHistoryRepository } from '../redemptions/repository';
import { AppConfigService } from 'src/default/config/config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payout, BankAccount]),
    AuthModule,
    KycModule,
    DynamicConfigModule,
    RewardsModule,
    RedisModule,
    IdempotencyModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PayoutRepository,
    BankAccountRepository,
    PointHistoryRepository,
    AppConfigService,
  ],
  exports: [PaymentService, PayoutRepository, BankAccountRepository],
})
export class PaymentModule {}
