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
import { RedemptionOtpValidator } from './validator/otp-validation.validator';
import { RedemptionProviderResponseHandler } from './handlers/redemption-provider-response.handler';
import { RedemptionProviderPayloadBuilder } from './builders/redemption-provider-payload.builder';
import { OrderPlaceProvider } from './provider/order-place.provider';
import { AppConfigService } from 'src/default/config/config.service';

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
    IdempotencyService,
    RedemptionOtpValidator,
    RedemptionProviderResponseHandler,
    RedemptionProviderPayloadBuilder,
    OrderPlaceProvider,
    AppConfigService
  ],
})
export class RedemptionsModule {}
