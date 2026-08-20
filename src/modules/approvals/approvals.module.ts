import { Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';

import { ApprovalRepository } from './repository';
import { AuthModule } from '../auth/auth.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [AuthModule, KycModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalRepository],
  exports: [ApprovalsService, ApprovalRepository],
})
export class ApprovalsModule {}
