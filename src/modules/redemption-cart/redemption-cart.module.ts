import { Module, forwardRef } from '@nestjs/common';
//
import { RedemptionCartService } from './redemption-cart.service';
import { RedemptionCartController } from './redemption-cart.controller';
import {
  RedemptionCartRepository,
  RedemptionCartItemRepository,
} from './repository/redemption-cart.repository';
import { KycModule } from '../kyc/kyc.module';
import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';
import { RedemptionsModule } from '../redemptions/redemptions.module';

@Module({
  imports: [AuthModule, KycModule, RewardsModule, forwardRef(() => RedemptionsModule)],
  controllers: [RedemptionCartController],
  providers: [RedemptionCartService, RedemptionCartRepository, RedemptionCartItemRepository],
  exports: [RedemptionCartService, RedemptionCartRepository, RedemptionCartItemRepository],
})
export class RedemptionCartModule {}
