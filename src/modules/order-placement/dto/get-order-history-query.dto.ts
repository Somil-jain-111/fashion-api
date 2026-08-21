import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { OrderPlacementSource, OrderPlacementStatus } from '../enum/order-placement.enum';

export class GetOrderHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(OrderPlacementStatus)
  status?: OrderPlacementStatus;

  @IsOptional()
  @IsEnum(OrderPlacementSource)
  source?: OrderPlacementSource;
}