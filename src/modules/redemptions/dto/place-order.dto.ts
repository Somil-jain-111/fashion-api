import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlaceOrderDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  addressId?: string;
}
