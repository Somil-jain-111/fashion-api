import { Controller, Post, Body, UseInterceptors, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PayoutTransactionDto, VerifyTransactionOtpDto } from './dto';
import { NoCache } from 'src/default/cache/cache.decorator';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Bank transfer OTP sent successfully.')
  @Post('transaction')
  async payoutTransaction(@Req() request: any, @Body() dto: PayoutTransactionDto) {
    const userId = request.user.id;
    const response = await this.paymentService.payoutTransaction(userId, dto.amount, dto.points);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Bank transfer verification and payout placed successfully.')
  @Post('verify-transaction')
  async verifyTransactionOTP(@Req() request: any, @Body() body: VerifyTransactionOtpDto) {
    const userId = request.user.id;
    const response = await this.paymentService.verifyPayoutOtp(
      userId,
      body.transactionId,
      body.otp
    );
    return DataSanitizer.sanitizeData(response);
  }
}
