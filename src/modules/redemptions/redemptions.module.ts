import { Module } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { RedemptionsController } from './redemptions.controller';
import {
  OrderRepository,
  RedemptionConfigRepository,
  PointHistoryRepository,
  ShippingDetailRepository,
  VoucherRepository,
} from 'src/modules/redemptions/repository';
import { TransactionService } from 'src/default/databases/transaction';
import { ProductProvider } from '../rewards/provider/products.provider';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedemptionOtpValidator } from './validator/otp-validation.validator';
import { RedemptionProviderResponseHandler } from './handlers/redemption-provider-response.handler';
import { RedemptionProviderPayloadBuilder } from './builders/redemption-provider-payload.builder';
import { OrderPlaceProvider } from './provider/order-place.provider';
import { AppConfigService } from 'src/default/config/config.service';
import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { AddressesModule } from '../addresses/addresses.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [RedisModule, AuthModule, KycModule, AddressesModule, RewardsModule],
  controllers: [RedemptionsController],
  providers: [
    RedemptionsService,
    RedemptionConfigRepository,
    TransactionService,
    OrderRepository,
    PointHistoryRepository,
    ShippingDetailRepository,
    VoucherRepository,
    ProductProvider,
    IdempotencyService,
    RedemptionOtpValidator,
    RedemptionProviderResponseHandler,
    RedemptionProviderPayloadBuilder,
    OrderPlaceProvider,
    AppConfigService,
  ],
})
export class RedemptionsModule {}
