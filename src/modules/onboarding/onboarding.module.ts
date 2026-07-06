import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';

@Module({
  imports: [
    AuthModule,
    KycModule,
    RedisModule,
  ],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    IdempotencyService,
  ],
  exports: [OnboardingService],
})
export class OnboardingModule {}
