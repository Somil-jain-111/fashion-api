import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { NoCache } from 'src/default/cache/cache.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { OrderPlacementService } from './order-placement.service';
import { CreateOrderPlacementDto } from './dto/create-order-placement.dto';

@NoCache()
@SkipThrottle()
@UseGuards(JwtAuthGuard)
@Controller('order-placement')
export class OrderPlacementController {
  constructor(private readonly orderPlacementService: OrderPlacementService) {}

  @Post()
  async placeOrder(@Req() req: any, @Body() dto: CreateOrderPlacementDto) {
    const response = await this.orderPlacementService.placeOrder(req.user.id, dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const response = await this.orderPlacementService.findOne(req.user.id, id);
    return DataSanitizer.sanitizeData(response);
  }
}
