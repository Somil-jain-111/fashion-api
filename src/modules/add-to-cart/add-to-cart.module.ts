import { Module } from '@nestjs/common';
import { AddToCartService } from './add-to-cart.service';
import { AddToCartController } from './add-to-cart.controller';

@Module({
  controllers: [AddToCartController],
  providers: [AddToCartService],
})
export class AddToCartModule {}
