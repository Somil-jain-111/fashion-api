import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { FaqQueryDto } from 'src/modules/cms/faq/dto/faq-query.dto';

/**
 * FaqQueryDto has no page/limit fields, and the app's global ValidationPipe runs with
 * forbidNonWhitelisted — passing ?page=&limit= against the bare DTO trips VAL_006. Extend it
 * here rather than touching the shared faq module.
 */
export class AdminFaqQueryDto extends FaqQueryDto {
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
