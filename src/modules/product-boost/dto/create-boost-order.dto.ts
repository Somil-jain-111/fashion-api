import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BoostTargetType } from '../entities';

export class CreateBoostOrderItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @IsEnum(BoostTargetType)
  targetType!: BoostTargetType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  durationDays!: number;
}

export class CreateBoostOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateBoostOrderItemDto)
  items!: CreateBoostOrderItemDto[];
}
