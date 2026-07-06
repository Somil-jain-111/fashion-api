import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RetailerOnboarding, RetailerApproval, ApprovalLog } from './entities';
import { OnboardingService } from './onboarding.service';
import { ApprovalService } from './approval.service';
import { OnboardingController } from './onboarding.controller';
import { ApprovalController } from './approval.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RetailerOnboarding, RetailerApproval, ApprovalLog])],
  controllers: [OnboardingController, ApprovalController],
  providers: [OnboardingService, ApprovalService],
  exports: [ApprovalService, OnboardingService],
})
export class OnboardingApprovalModule {}