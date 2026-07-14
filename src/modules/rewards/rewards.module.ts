import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { ProductProvider } from './provider/products.provider';
import { AuthModule } from '../auth/auth.module';
import { AppConfigService } from 'src/default/config/config.service';
import { ApiResponseRepository } from '../kyc/repository';

@Module({
  imports: [AuthModule],
  controllers: [RewardsController],
  providers: [RewardsService, ProductProvider, AppConfigService, ApiResponseRepository],
  exports: [RewardsService, ProductProvider],
})
export class RewardsModule {}
