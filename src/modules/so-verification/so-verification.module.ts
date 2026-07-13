import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoVerificationEvidence } from './entities/so-verification.entity';
import { SoVerificationService } from './so-verification.service';
import { SoVerificationController } from './so-verification.controller';
import { ApprovalsModule } from '../approvals/approvals.module';
import { SoVerificationRepository } from './so-verification.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([SoVerificationEvidence]),
    ApprovalsModule, // to use ApprovalsService.handleApprovalAction
  ],
  controllers: [SoVerificationController],
  providers: [SoVerificationService, SoVerificationRepository],
  exports: [SoVerificationService, SoVerificationRepository],
})
export class SoVerificationModule {}