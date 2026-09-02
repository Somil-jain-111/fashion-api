import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { BoostPaymentWebhookDto, CreateBoostOrderDto } from './dto';
import { ProductBoostService } from './product-boost.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@NoCache()
@Controller()
export class ProductBoostController {
  constructor(private readonly productBoostService: ProductBoostService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SELLER_ADMIN])
  @Get('sellers/product-boosts/pricing')
  pricing() {
    return DataSanitizer.sanitizeData(this.productBoostService.getPricing());
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SELLER_ADMIN])
  @Post('sellers/product-boosts/orders')
  async createOrder(@Body() dto: CreateBoostOrderDto, @Req() req: any) {
    return DataSanitizer.sanitizeData(await this.productBoostService.createOrder(req.user.id, dto));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SELLER_ADMIN])
  @Get('sellers/product-boosts/orders')
  async listOrders(@Req() req: any) {
    return DataSanitizer.sanitizeData(await this.productBoostService.listSellerOrders(req.user.id));
  }

  @Post('webhooks/boost-payments')
  async paymentWebhook(
    @Body() dto: BoostPaymentWebhookDto,
    @Req() req: any,
    @Headers('x-boost-signature') signature?: string
  ) {
    return DataSanitizer.sanitizeData(
      await this.productBoostService.processPayment(dto, req.rawBody, signature)
    );
  }
}
