import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ProductImageDto {
  @IsNotEmpty({ message: 'Image url is required' })
  @IsString()
  url!: string;

  /**
   * Index into the same request's `variants` array (not a DB id) — resolved to the
   * real variant id after the variants are (re)created, since both are new rows
   * in the same transaction.
   */
  @IsOptional()
  @IsInt()
  variantIndex?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
