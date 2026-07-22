import { IsNotEmpty, IsString } from 'class-validator';

export class ResetTransactionOtpDto {
  @IsNotEmpty()
  @IsString()
  transactionId: string;
}
