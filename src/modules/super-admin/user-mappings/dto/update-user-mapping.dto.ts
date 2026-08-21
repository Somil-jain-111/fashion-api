import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdateUserMappingDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /**
   * Reassign this mapping to a different distributor/sub-distributor.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parentId?: number;
}
