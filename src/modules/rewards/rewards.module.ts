import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { ProductProvider } from './provider/products.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RewardsController],
  providers: [RewardsService, ProductProvider],
  exports: [RewardsService, ProductProvider],
})
export class RewardsModule {}
