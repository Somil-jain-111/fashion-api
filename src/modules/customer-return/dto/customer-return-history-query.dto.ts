import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';

export class CustomerReturnHistoryQueryDto extends PaginationQueryDto {
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
