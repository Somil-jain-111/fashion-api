import { IsEnum, IsOptional, IsString } from 'class-validator';

import { OrderPlacementStatus } from '../enum/order-placement.enum';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';

export class GetOrderHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderPlacementStatus)
  status?: OrderPlacementStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
