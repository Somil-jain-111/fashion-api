import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { OrderPlacementStatus } from 'src/modules/order-placement/enum/order-placement.enum';

export class ListStockOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  distributorId?: number;

  @IsOptional()
  @IsEnum(OrderPlacementStatus)
  status?: OrderPlacementStatus;

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
