import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCartDto {

  @IsOptional()
  cartonQuantity?: number | '+' | '-';

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;
}
