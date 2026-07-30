import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { RedemptionCartService } from './redemption-cart.service';
import { ManageCartItemDto } from './dto/manage-cart-item.dto';
import { PlaceCartOrderDto } from '../redemptions/dto/place-cart-order.dto';
import { VerifyOrderDto } from '../redemptions/dto/verify-order.dto';
import { RemoveCartItemDto } from '../redemptions/dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('redemptions-cart')
export class RedemptionCartController {
  constructor(private readonly redemptionCartService: RedemptionCartService) {}

  @NoCache()
  @Get()
  @ResponseMessage('Cart fetched successfully')
  async getCart(@Req() req: any) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.getCart(userId);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @ResponseMessage('Cart updated successfully')
  async manageCartItem(@Req() req: any, @Body() dto: ManageCartItemDto) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.manageCartItem(userId, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('remove-item')
  @ResponseMessage('Item removed from cart successfully')
  async removeItem(@Req() req: any, @Body() body: RemoveCartItemDto) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.removeItem(userId, body.itemId);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @Post('clear-cart')
  @ResponseMessage('Cart cleared successfully')
  async clearCart(@Req() req: any) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.clearCart(userId);
    return DataSanitizer.sanitizeData(response);
  }
}
