import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/default/common/dto/pagination-query.dto";

export class GetProductQueryDTO extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  projectProductId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortBy?: "asc" | "desc";

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;
}