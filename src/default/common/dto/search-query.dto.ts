// src/common/dto/search-query.dto.ts

import { IsOptional, IsString, MaxLength } from "class-validator";

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}