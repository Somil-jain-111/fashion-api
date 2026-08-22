import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CmsPageQueryDto } from 'src/modules/cms/cms-page/dto/cms-page-query.dto';

/**
 * CmsPageQueryDto has no page/limit fields, and the app's global ValidationPipe runs with
 * forbidNonWhitelisted — passing ?page=&limit= against the bare DTO trips VAL_006. Extend it
 * here rather than touching the shared cms-page module.
 */
export class AdminCmsPageQueryDto extends CmsPageQueryDto {
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
