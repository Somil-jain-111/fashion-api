import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PointStatusEnum } from 'src/modules/redemptions/enum/point-history-status.enum.';
import { RedemptionType } from 'src/modules/redemptions/enum/redemption-type.enum';


export class GetPointHistoryQueryDto {
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
  @IsEnum(RedemptionType)
  type?: RedemptionType;

  @IsOptional()
  @IsEnum(PointStatusEnum)
  status?: PointStatusEnum;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  year?: string;
}