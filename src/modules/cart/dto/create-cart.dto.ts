import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCartDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  distributorId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId: number;

  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsString()
  size: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cartonSize: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cartonQuantity = 1;

  @IsOptional()
  @IsBoolean()
  isSelected = true;
}
