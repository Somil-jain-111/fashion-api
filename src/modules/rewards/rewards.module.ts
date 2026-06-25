import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { ProductProvider } from './provider/products.provider';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';

@Module({
  controllers: [RewardsController],
  providers: [RewardsService, ProductProvider, UserAuthValidator],
})
export class RewardsModule {}
