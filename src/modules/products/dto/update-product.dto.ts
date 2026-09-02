import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProductZone } from 'src/default/common/enums/product.enum';
import { ProductVariantDto } from './product-variant.dto';
import { ProductImageDto } from './product-image.dto';
import { ProductAttributeValueDto } from './product-attribute-value.dto';
import { ProductSubmissionAction } from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  sellerSku?: string;

  @IsOptional()
  @IsInt()
  brandOptionId?: number;

  @IsOptional()
  @IsInt()
  productTypeOptionId?: number;

  @IsOptional()
  @IsInt()
  genderOptionId?: number;

  @IsOptional()
  @IsInt()
  countryOptionId?: number;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  highlights?: string;

  @IsOptional()
  @IsString()
  materialAndFabric?: string;

  @IsOptional()
  @IsString()
  careInstructions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueDto)
  attributes?: ProductAttributeValueDto[];

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  /** Strikethrough reference price. currentPrice is derived server-side, never accepted here. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  mrp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsEnum(ProductZone)
  zone?: ProductZone;

  /**
   * Full-replace, not a diff: if present, this array entirely replaces the
   * product's existing variants (and any images pass omits keep the old ones).
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  /** Full-replace — see `variants`. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsEnum(ProductSubmissionAction)
  submissionAction?: ProductSubmissionAction;
}
