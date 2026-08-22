import { IsEnum, IsInt, IsOptional } from 'class-validator';

import { OrderPlacementSource, OrderPlacementStatus } from '../enum/order-placement.enum';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';

export class GetOrderHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderPlacementStatus)
  status?: OrderPlacementStatus;

  @IsOptional()
  @IsEnum(OrderPlacementSource)
  source?: OrderPlacementSource;
}
