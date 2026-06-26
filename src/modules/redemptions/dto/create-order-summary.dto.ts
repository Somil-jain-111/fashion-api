import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateOrderSummaryDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  addressId?: string;
}