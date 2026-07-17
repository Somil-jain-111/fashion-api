import { PartialType } from '@nestjs/swagger';
import { CreateAddToCartDto } from './create-add-to-cart.dto';

export class UpdateAddToCartDto extends PartialType(CreateAddToCartDto) {}
