import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { RedemptionCartService } from './redemption-cart.service';
import { ManageCartItemDto } from './dto/manage-cart-item.dto';

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
  @ResponseMessage('Cart updated successfully')
  async manageCartItem(@Req() req: any, @Body() dto: ManageCartItemDto) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.manageCartItem(userId, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Delete('items/:id')
  @ResponseMessage('Item removed from cart successfully')
  async removeItem(@Req() req: any, @Param('id') id: string) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.removeItem(userId, id);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Delete('clear')
  @ResponseMessage('Cart cleared successfully')
  async clearCart(@Req() req: any) {
    const userId = Number(req.user.id);
    const response = await this.redemptionCartService.clearCart(userId);
    return DataSanitizer.sanitizeData(response);
  }
}
