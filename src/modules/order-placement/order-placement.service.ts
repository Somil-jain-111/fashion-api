import { Injectable } from '@nestjs/common';
import { CreateOrderPlacementDto } from './dto/create-order-placement.dto';
import { UpdateOrderPlacementDto } from './dto/update-order-placement.dto';

@Injectable()
export class OrderPlacementService {
  create(createOrderPlacementDto: CreateOrderPlacementDto) {
    return 'This action adds a new orderPlacement';
  }

  findAll() {
    return `This action returns all orderPlacement`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orderPlacement`;
  }

  update(id: number, updateOrderPlacementDto: UpdateOrderPlacementDto) {
    return `This action updates a #${id} orderPlacement`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderPlacement`;
  }
}
