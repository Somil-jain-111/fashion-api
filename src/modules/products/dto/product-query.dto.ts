import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
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
  @IsNumberString()
  page = 1;

  @IsOptional()
  @IsNumberString()
  pageSize = 10;
}
