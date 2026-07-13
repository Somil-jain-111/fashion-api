// src/common/dto/filter-query.dto.ts

import { IsOptional, IsString } from 'class-validator';

export class FilterQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
