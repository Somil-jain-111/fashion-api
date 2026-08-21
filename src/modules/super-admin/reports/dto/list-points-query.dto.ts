import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';

export class ListPointsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  userId?: number;

  @IsOptional()
  @IsEnum(RedemptionType)
  type?: RedemptionType;

  @IsOptional()
  @IsEnum(PointStatusEnum)
  status?: PointStatusEnum;

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
