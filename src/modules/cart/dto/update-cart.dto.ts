import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCartDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cartonQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}
