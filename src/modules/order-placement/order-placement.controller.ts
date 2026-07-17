import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderPlacementService } from './order-placement.service';
import { CreateOrderPlacementDto } from './dto/create-order-placement.dto';
import { UpdateOrderPlacementDto } from './dto/update-order-placement.dto';

@Controller('order-placement')
export class OrderPlacementController {
  constructor(private readonly orderPlacementService: OrderPlacementService) {}

  @Post()
  create(@Body() createOrderPlacementDto: CreateOrderPlacementDto) {
    return this.orderPlacementService.create(createOrderPlacementDto);
  }

  @Get()
  findAll() {
    return this.orderPlacementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderPlacementService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderPlacementDto: UpdateOrderPlacementDto) {
    return this.orderPlacementService.update(+id, updateOrderPlacementDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderPlacementService.remove(+id);
  }
}
