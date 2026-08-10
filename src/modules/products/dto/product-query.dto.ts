import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';
import { SortByEnum } from '../enum/sort-by.enum';

export class ProductQueryDto {
  @IsOptional()
  @IsNumberString()
  categoryId?: number;

  @IsOptional()
  @IsNumberString()
  subCategoryId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SortByEnum)
  sortBy?: SortByEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize = 10;
}
