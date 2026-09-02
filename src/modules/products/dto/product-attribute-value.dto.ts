import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ProductAttributeValueDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  key!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  optionId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  value?: string;
}
