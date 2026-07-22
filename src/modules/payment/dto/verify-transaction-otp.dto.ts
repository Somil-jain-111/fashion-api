import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyTransactionOtpDto {
  @IsNotEmpty()
  @IsString()
  transactionId: string;

  @IsNotEmpty()
  @IsString()
  @Length(4)
  otp: string;
}
