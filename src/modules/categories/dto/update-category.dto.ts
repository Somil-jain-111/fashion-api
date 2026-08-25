import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be url-safe (lowercase letters, numbers, hyphens)',
  })
  slug?: string;

  /**
   * Explicitly nullable (not just optional) so a client can move a category
   * back to top-level by sending `parentId: null`.
   */
  @IsOptional()
  parentId?: number | null;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
