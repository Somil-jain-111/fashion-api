import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';

export class GetPointHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RedemptionType)
  type?: RedemptionType;

  @IsOptional()
  @IsEnum(PointStatusEnum)
  status?: PointStatusEnum;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
