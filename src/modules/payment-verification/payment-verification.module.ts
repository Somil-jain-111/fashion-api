import { Module } from '@nestjs/common';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentVerificationController } from './payment-verification.controller';

@Module({
  controllers: [PaymentVerificationController],
  providers: [PaymentVerificationService],
})
export class PaymentVerificationModule {}
