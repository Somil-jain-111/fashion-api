import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
//
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { ApprovalStatus } from 'src/default/common/enums/approvals.enum';

export class QueueQueryDto extends PaginationQueryDto {
  @IsEnum(ApprovalStatus)
  @IsOptional()
  status?: ApprovalStatus;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  approvalId?: number;
}
