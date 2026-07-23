import { IsOptional, IsString } from 'class-validator';
//
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';

export class GetPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  transactionId?: string;
}
