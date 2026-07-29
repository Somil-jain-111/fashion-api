import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseInterceptors,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { PlaceOrderDto } from './dto/place-order.dto';
import { PlaceCartOrderDto } from './dto/place-cart-order.dto';
import { NoCache } from 'src/default/cache/cache.decorator';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { VerifyOrderDto } from './dto/verify-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER, UserRole.EMPLOYEE])
@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('place-order')
  @ResponseMessage('Order placed successfully. OTP has been sent.')
  async placeOrder(@Req() req: any, @Body() body: PlaceOrderDto) {
    const response = await this.redemptionsService.placeOrder(req.user.id, body);

    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('verify-order')
  @ResponseMessage('Redemption OTP verified and order placed successfully')
  async verifyOrder(@Req() req: any, @Body() dto: VerifyOrderDto) {
    const response = await this.redemptionsService.verifyOrder(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('place-cart-order')
  @ResponseMessage('Cart order placed successfully. OTP has been sent.')
  async placeCartOrder(@Req() req: any, @Body() body: PlaceCartOrderDto) {
    const response = await this.redemptionsService.placeCartOrder(req.user.id, body);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('verify-cart-order')
  @ResponseMessage('Redemption cart OTP verified and order placed successfully')
  async verifyCartOrder(@Req() req: any, @Body() dto: VerifyOrderDto) {
    const response = await this.redemptionsService.verifyCartOrder(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get('orders')
  @ResponseMessage('Orders fetched successfully')
  async getOrders(@Req() req: any, @Query() query: GetOrdersQueryDto) {
    const response = await this.redemptionsService.getOrders(req.user.id, query);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post('resend-otp')
  @ResponseMessage('OTP resent successfully')
  async resendOtp(@Req() req: any, @Body() dto: ResendOtpDto) {
    const response = await this.redemptionsService.resendOtp(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }
}
