import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UseGuards,
  Req,
  Query,
  Get,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
//
import {
  CreatePointPurchaseDto,
  CreatePointPurchaseWithCallbackDto,
  GetPaymentsQueryDto,
  PayoutTransactionDto,
  ResetTransactionOtpDto,
  VerifyTransactionOtpDto,
} from './dto';
import { PaymentService } from './payment.service';
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
@Roles([UserRole.RETAILER, UserRole.EMPLOYEE])
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Payment link created successfully. Complete payment to add points.')
  @Post('points/payment-link')
  async createPointPaymentLink(@Req() request: any, @Body() dto: CreatePointPurchaseDto) {
    const response = await this.paymentService.createPointPurchase(
      Number(request.user.id),
      dto.points
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Payment link created successfully. Complete payment to add points.')
  @Post('points/payment-link-with-callback')
  async createPointPaymentLinkWithCallback(
    @Req() request: any,
    @Body() dto: CreatePointPurchaseWithCallbackDto
  ) {
    const response = await this.paymentService.createPointPurchase(
      Number(request.user.id),
      dto.points,
      dto.callback_url
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Bank transfer OTP sent successfully.')
  @Post('transaction')
  async payoutTransaction(@Req() request: any, @Body() dto: PayoutTransactionDto) {
    const userId = request.user.id;
    const response = await this.paymentService.payoutTransaction(
      userId,
      dto.amount,
      dto.points,
      dto.beneId
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Bank transfer OTP sent successfully.')
  @Post('reset-otp')
  async resetPayoutOtp(@Req() request: any, @Body() body: ResetTransactionOtpDto) {
    const userId = request.user.id;
    const response = await this.paymentService.resetPayoutOtp(userId, body.transactionId);
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

  @NoCache()
  @SkipThrottle()
  @ResponseMessage('Bank transfer verification and payout placed successfully.')
  @Get('all')
  async fetchPayouts(@Req() request: any, @Query() query: GetPaymentsQueryDto) {
    const userId = request.user.id;
    const response = await this.paymentService.fetchAllPayments(userId, query);
    return DataSanitizer.sanitizeData(response);
  }
}
