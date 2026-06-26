import { Module } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { RedemptionsController } from './redemptions.controller';
import {
  KycVerificationRepository,
  OrderRepository,
  RedemptionConfigRepository,
  UserRepository,
} from 'src/default/common/repositories';
import { TransactionService } from 'src/default/databases/transaction';
import { AddressesService } from '../addresses/addresses.service';
import { RewardsService } from '../rewards/rewards.service';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { ProductProvider } from '../rewards/provider/products.provider';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';

@Module({
  imports: [RedisModule],
  controllers: [RedemptionsController],
  providers: [
    RedemptionsService,
    RedemptionConfigRepository,
    KycVerificationRepository,
    UserRepository,
    TransactionService,
    AddressesService,
    RewardsService,
    OrderRepository,
    UserAuthValidator,
    ProductProvider,
    IdempotencyService

  ],
})
export class RedemptionsModule {}
