import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class ListDistributorReturnsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  distributorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  retailerId?: number;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}
