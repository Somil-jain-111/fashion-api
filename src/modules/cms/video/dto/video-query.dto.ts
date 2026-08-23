import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';

export class VideoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  isActive?: string;

  /**
   * Matches against title or description.
   */
  @IsOptional()
  @IsString()
  search?: string;
}
