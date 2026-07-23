import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { OrderPlacementSource } from '../enum/order-placement.enum';

export class BuyNowOrderItemDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId: number;

  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsString()
  size: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cartonSize: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cartonQuantity = 1;
}

export class CreateOrderPlacementDto {
  @IsNotEmpty()
  @IsEnum(OrderPlacementSource)
  source: OrderPlacementSource;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  distributorId: number;

  @ValidateIf((dto) => dto.source === OrderPlacementSource.BUY_NOW)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BuyNowOrderItemDto)
  buyNowItem?: BuyNowOrderItemDto;
}
