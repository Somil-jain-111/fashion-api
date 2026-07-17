import { Injectable } from '@nestjs/common';
import { CreateAddToCartDto } from './dto/create-add-to-cart.dto';
import { UpdateAddToCartDto } from './dto/update-add-to-cart.dto';

@Injectable()
export class AddToCartService {
  create(createAddToCartDto: CreateAddToCartDto) {
    return 'This action adds a new addToCart';
  }

  findAll() {
    return `This action returns all addToCart`;
  }

  findOne(id: number) {
    return `This action returns a #${id} addToCart`;
  }

  update(id: number, updateAddToCartDto: UpdateAddToCartDto) {
    return `This action updates a #${id} addToCart`;
  }

  remove(id: number) {
    return `This action removes a #${id} addToCart`;
  }
}
