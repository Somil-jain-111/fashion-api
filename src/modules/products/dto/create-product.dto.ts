import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { ProductZone } from 'src/default/common/enums/product.enum';
import { ProductVariantDto } from './product-variant.dto';
import { ProductImageDto } from './product-image.dto';
import { ProductAttributeValueDto } from './product-attribute-value.dto';

export enum ProductSubmissionAction {
  SAVE_DRAFT = 'SAVE_DRAFT',
  SUBMIT_FOR_APPROVAL = 'SUBMIT_FOR_APPROVAL',
}

export class CreateProductDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  sellerSku!: string;

  @IsInt()
  @Min(1)
  brandOptionId!: number;

  @IsInt()
  @Min(1)
  productTypeOptionId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  genderOptionId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  countryOptionId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

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

  @IsInt()
  categoryId!: number;

  @IsNumber()
  @Min(0)
  basePrice!: number;

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

  @IsEnum(ProductZone)
  zone!: ProductZone;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one variant is required' })
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @IsOptional()
  @IsEnum(ProductSubmissionAction)
  submissionAction?: ProductSubmissionAction;
}
