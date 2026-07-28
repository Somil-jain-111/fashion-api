import { Body, Controller, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('payment/webhooks')
export class RazorpayWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @SkipThrottle()
  @Post('razorpay')
  async processRazorpayWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() event: Record<string, any>
  ) {
    const response = await this.paymentService.processRazorpayWebhook(
      request.rawBody,
      signature,
      event
    );
    return DataSanitizer.sanitizeData(response);
  }
}
