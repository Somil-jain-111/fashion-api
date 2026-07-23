import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlaceOrderDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  addressId?: string;
}
