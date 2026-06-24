// src/common/dto/sort-query.dto.ts

import { IsIn, IsOptional, IsString } from "class-validator";

export class SortQueryDto {
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"])
  sortOrder?: "ASC" | "DESC" | "asc" | "desc" = "DESC";
}