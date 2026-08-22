import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { BannerQueryDto } from 'src/modules/cms/banner/dto/banner-query.dto';

/**
 * BannerQueryDto has no page/limit fields, and the app's global ValidationPipe runs with
 * forbidNonWhitelisted — passing ?page=&limit= against the bare DTO trips VAL_006. Extend it
 * here rather than touching the shared banner module.
 */
export class AdminBannerQueryDto extends BannerQueryDto {
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
}
