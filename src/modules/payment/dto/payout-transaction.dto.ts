import { IsIn, IsInt, IsNotEmpty, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class PayoutTransactionDto {
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(5000)
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(5000)
  points: number;

  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  beneId: number;
}
