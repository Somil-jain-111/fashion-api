import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlaceOrderDto {
  @IsOptional()
  @IsString()
  projectProductId?: string;

  @IsOptional()
  @IsString()
  addressId?: string;
}
