import { Module } from '@nestjs/common';
//
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { AppConfigService } from 'src/default/config/config.service';
import { KycModule } from '../kyc/kyc.module';
import { AuthModule } from '../auth/auth.module';
import { IdempotencyModule } from 'src/default/idempotency/idempotency.module';

@Module({
  imports: [AuthModule, KycModule, IdempotencyModule],
  controllers: [PublicController],
  providers: [PublicService, AppConfigService],
  exports: [PublicService],
})
export class PublicModule {}
