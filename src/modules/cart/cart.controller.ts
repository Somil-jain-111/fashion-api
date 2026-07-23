import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { ClearCartQueryDto, GetCartQueryDto } from './dto/cart-query.dto';

@NoCache()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @NoCache() 
  @Get()
  async getCart(@Req() req: any, @Query() query: GetCartQueryDto) {
    const response = await this.cartService.getCart(req.user.id, query.distributorId);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('items')
  async addItem(@Req() req: any, @Body() dto: CreateCartDto) {
    const response = await this.cartService.addItem(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('items/:itemId')
  async updateItem(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: UpdateCartDto) {
    const response = await this.cartService.updateItem(req.user.id, itemId, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post('items/delete/:itemId')
  async removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    const response = await this.cartService.removeItem(req.user.id, itemId);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Post('items/clear-cart/delete')
  async clearCart(@Req() req: any, @Query() query: ClearCartQueryDto) {
    const response = await this.cartService.clearCart(req.user.id, query.distributorId);
    return DataSanitizer.sanitizeData(response);
  }
}
