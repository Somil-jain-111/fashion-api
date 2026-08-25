import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProductVariantDto {
  @IsNotEmpty({ message: 'Size is required' })
  @IsString()
  size!: string;

  @IsNotEmpty({ message: 'SKU is required' })
  @IsString()
  sku!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @IsInt()
  @Min(0)
  stockQuantity!: number;
}
