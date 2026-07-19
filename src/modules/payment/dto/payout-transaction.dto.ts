import { IsInt, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class PayoutTransactionDto {
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Min(200)
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Min(660)
  points: number;
}
