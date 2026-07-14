import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';

export class GetOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  orderId?: string;
}
