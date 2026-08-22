import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, Length, Max, Min } from 'class-validator';
import { OrderStatus, ShippingStatus } from 'src/modules/redemptions/enum/order-status.enum';
import { ParentOrderType } from 'src/modules/redemptions/enum/order-type.enum';
import { ProductType } from 'src/modules/redemptions/enum/product-type.enum';

export class ListRedemptionOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(ParentOrderType)
  orderType?: ParentOrderType;

  /**
   * At least one line item on the order matches this product type (physical vs digital).
   */
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  /**
   * At least one line item's shipping record has this delivery status.
   */
  @IsOptional()
  @IsEnum(ShippingStatus)
  deliveryStatus?: ShippingStatus;

  /**
   * Matches against order number, user mobile, user firm name, or username.
   */
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}
